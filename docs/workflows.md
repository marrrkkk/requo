# Requo Workflows

End-to-end flows that cross architectural boundaries. Each follows trigger → entry → validation → logic → DB → side effects → result. See `docs/domain.md` (states), `docs/ai.md` (Agent/Assistant), `docs/integrations.md` (email/push/billing).

## Inquiry intake (public Service submit)

```text
Visitor on /inquire/{slug}[/{serviceSlug}]
→ submitPublicInquiryAction (features/inquiries/actions.ts)
→ honeypot → business/form lookup (features/inquiries/queries.ts)
→ rate limit (lib/public-action-rate-limit.ts)
→ plan-scoped form config (features/inquiries/plan-rules.ts)
→ Zod validatePublicInquirySubmission (features/inquiries/schemas.ts)
→ createInquirySubmission (features/inquiries/mutations.ts)
→ inquiries row (status new, source service)
→ attachment upload (Supabase inquiry-attachments)
→ qualifyInquiry + requo/inquiry.qualified event
→ ack email (if enabled) + business notification + audit + push event
→ business inbox
```

Both intake paths share `createInquirySubmission`: Agent approval (`approveAgentProposalAction` → `createAgentInquirySubmission`, `source ai_assistant`, `ai_assisted true`) and owner-manual (`createAssistantInquirySubmission`) reuse it. Qualification scoring, duplicate detection (`inquiry_duplicates`), and the AI-draft trigger all run downstream of the same write.

## Agent qualification → Proposed Inquiry → approval

```text
Visitor on /b/{slug}/chat
→ POST app/api/ai/agent/chat (per-IP + per-session limits, Pro+ entitlement)
→ runAgent (features/ai-agent/orchestrator.ts): load session → sanitize → persist turn
→ streamText loop (max 5 steps): search_knowledge / get_business_info / get_services
→ qualification extractor fills customerName + contact + targetServiceId + details
→ propose_inquiry stages pending proposal in ai_agent_sessions.state (commits nothing)
→ inline Proposed Inquiry card; visitor edits / approves / continues chatting
→ approveAgentProposalAction consumes exactly once → createAgentInquirySubmission
→ inquiries row (status new) → session completed → business inbox
```

Escalation is the second commit path and stays ungated: `createAgentHandoffSubmission` (`escalated`, `source ai_assistant`) → inbox with `needsAttention`. Note: the handoff helper exists in `features/inquiries/mutations.ts` but is not currently wired as a model tool, so model-initiated handoff is unreachable until wired. Abandoned sessions sweep hourly; transcripts without an inquiry purge after 30 days (ADR 004).

## Quote draft → send → respond → follow up

```text
Owner on inquiry or quotes/new
→ generateQuoteDraftAction (staff+, aiQuoteDrafting entitlement, usage limit)
→ generateQuoteDraftForBusiness (features/ai/quote-generator.ts):
   inquiry context + pricing candidates + knowledge → LLM JSON (prices zeroed)
   → server hydrates DB prices → verify/repair → readiness + missing info
→ owner reviews/edits (quote editor, features/quotes/*)
→ send (sendQuoteEmail + markQuoteSentForBusiness): status draft → sent,
   publicToken issued, email via outbox (Resend → Mailtrap → Brevo)
→ customer opens /quote/{token}: quote_public_viewed event, first-viewed stamp,
   business notification; responds accept / reject / revision request
→ accepted → status accepted (+ revision loop back to sent on revision_requested)
→ auto-follow-up sequence (quotes.autoFollowUp*, jobs/auto-follow-ups.ts,
   Inngest cron + requo/quotes.enable-auto-follow-up) nudges silent sent quotes
→ expired via /api/cron/expire-quotes (valid_until passed)
```

Invoice creation is gated on `status = accepted` (`app/(business)/[businessSlug]/(main)/invoices/new/page.tsx`). Quote versions snapshot on send; revision requests carry per-item comments.

## Owner follow-ups vs auto emails vs notifications

- **Follow-up task** (`follow_ups`, `features/follow-ups/`): owner reminder linked to inquiry and/or quote, `pending → completed|skipped`, recurrence + snooze + `reminderSentAt`. Surfaced in inbox, dashboard, and Inngest reminder job.
- **Auto follow-up email** (`quotes.autoFollowUp*`, `features/quotes/jobs/auto-follow-ups.ts`): unattended customer nudge sequence for `sent` quotes; template `businesses.quote_follow_up_template`; attempt 1 "Following up" vs 2+ "Checking in" is send-time logic.
- **Suggested Message**: copy-paste draft only, no send, no row.
- **Notification** (`business_notifications` + Web Push + Realtime bell): `insertBusinessNotification` on inquiry submitted, quote viewed/accepted/rejected/revision/expiring, follow-up due, member invite accepted/declined, invoice paid/overdue. Read = watermark (`business_notification_states`) OR explicit row.

## Invoice → manual payment

```text
Owner on accepted quote (or standalone) → create invoice (draft)
→ send (invoice email template, no public pay page by design)
→ status sent → unpaid | partially_paid | paid | overdue (derived from
   non-void payments vs total + due date; draft/void take precedence)
→ recordPaymentForBusiness (amount > 0, method cash/bank_transfer/gcash/maya/check/other)
→ voided payments excluded; invoice void terminal; one non-void invoice per quote
```

No gateway, no customer payment page, no tax-compliance claims (ADR 010).

## Email send with fallback

```text
Feature/job event → sendEmailWithFallback (lib/email/send-email.ts)
→ validate → claim email_outbox row (idempotencyKey unique)
→ try Resend → Mailtrap → Brevo (lib/email/providers/*, first configured wins)
→ record email_attempts per try → mark sent / failed / unknown
→ failures surface to caller (quote send reports; Assistant reports + manual fallback)
```

`LOW_EMAIL_MODE=1` disables optional operational mail while auth + owner-requested quote delivery keep working. Never use `DISABLE_TRANSACTIONAL_EMAILS` for quota saving (breaks auth flows).
