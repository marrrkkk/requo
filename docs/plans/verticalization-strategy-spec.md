# Requo Verticalization — Complete Program Specification

Status: proposed — no implementation authorized by this document.
Scope: the complete end-to-end program, from fact-finding through post-launch evaluation (Part A, §§0–30), plus the implementation-ready Phase 2 domain/architecture and Phase 3 execution specification (Part B, §§B1–B37).
Revision: correction pass C1 integrated (artifact direction, chain identity, Change Order coverage, legacy rule, schedule acceptance, locked decisions). No scope change, no new primitives, no implementation authorized.
Explicitly deferred: all implementation work until Gate 4 (explicit authorization).

## 0. Executive Summary

Requo is a generic inquiry-to-quote SaaS whose taxonomy is display-only: fifteen stored `BusinessType` values and five marketing solution pages, with no downstream behavioral branching. Six distinct commercial workflows (contractors, agencies, IT consultants, photographers, event operators, fab shops) receive the same fields-and-quote experience, while vertical competitors win on workflow nativeness — Jobber's approve/sign/request-changes/deposit quote flow, shopVOX's versioned proof approval, ServiceTitan's never-touch-the-sold-estimate change orders, HoneyBook's select-service→sign→pay Smart Files.

This program keeps **one Requo product** (shared inquiry → quote → approval → close core) and adds exactly **five reusable primitives** — P1 Approvals, P2 Change Orders, P3 Structured Scope Blocks, P4 Intake Packs, P5 Commercial Schedules — configured by **six Behavior Packs**, with AI verticalized only through pack guidance and missing-information criticality inside the existing grounded-draft seams. Hard boundaries hold throughout: no payment processing, no inventory, no project management/dispatch, no per-vertical AI models, pricing library stays sole price authority.

Delivery runs twelve phases (0–11) behind seven authorization gates. Implementation, rollout, and migration are not authorized by this document.

**Smallest-set rule:** five primitives, six packs, three AI injections. Anything proposed beyond that must displace something inside it, not append to it.

## 1. Phase 0 — Fact-Finding & Current-State Audit

### 0.1 Current workflow map

Public business profile → inquire hub → per-service inquiry form (or AI agent chat → visitor-approved proposal → inquiry) → inquiry detail (notes, attachments, duplicate detection, activities, customer history) → quote creation (editor or AI draft → owner review → Resend email) → public token quote page (view tracking → typed-name acceptance with snapshot/hash, or reject, or revision request → owner revises into a new `quote_versions` row → re-send) → expiry reconciliation (cron + on-read sync) → terminal accepted-quote bookkeeping (`completedAt`/`canceledAt`, no reopen) → manual invoice → manually recorded payment (idempotency key, void-only corrections). Manual/automatic/sequence follow-ups with recurrence, snooze, and cron reminders run throughout. There is no post-acceptance commercial object.

### 0.2 Current feature inventory

Public/manual/AI-assisted/agent inquiry creation; inquiry-only attachments; notes; duplicate detection; seven inquiry statuses; activity timeline; customer history; quote builder + line items; product/pricing library (kinds `block|package|template`, pricing-scope only); templates; quote email; public token pages; view tracking; typed-name acceptance + snapshot/hash with optimistic `expectedVersion` concurrency; revision requests + versions; expiration; manual/automatic/sequence follow-ups + reminders + AI message suggestions; AI drafting + missing-info + RAG knowledge; invoices + manual payments; twelve notification types; analytics events + rollups; exports; team roles; audit logs.

### 0.3 Current data model

`inquiries` (+messages/attachments/notes/duplicates); `quotes` (+version, `validUntil`, send/view/respond timestamps, `autoFollowUp*`, `aiReadiness/aiMissingInfo/aiAcknowledged*`, completed/canceled/voided/archived/deleted) + `quote_items` (+AI provenance) + `quote_versions` (items snapshot) + `quote_revision_requests` + `quote_acceptances` (unique per quote+version, snapshot+hash); `follow_ups` (`sendMode manual|automatic`, recurrence/termination/parent, snooze/reminder); `invoices` (one active per quote) + `invoice_line_items` + `payments` (per-business idempotency) + `business_payment_counters`; `businesses` (plan, `businessType` defaulting to general); per-form `businessType`; `quote_library_*`; memories + knowledge files/chunks; notifications/states/reads; analytics events + rollups/benchmarks/annotations/reports/goals. Enums: inquiry 7, quote 7 (`draft/sent/revision_requested/accepted/rejected/expired/voided`), invoice 7, follow-up status 3 / channel 7 / recurrence 6 / termination 2 / send-mode 2, AI readiness 3, AI product status 4. Single-value `payment_source[manual]` confirms the manual-payments boundary in schema.

### 0.4 Current BusinessType implementation

Fifteen stored values plus seven legacy values with a non-destructive legacy map and a general fallback. Labels are picker copy only. Behavioral use is seeding-only: a six-way starter-template collapse, form placeholder/group-label/page-copy switches, onboarding pre-selection. No branching in quotes, invoices, follow-ups, AI prompts, or analytics.

### 0.5 Current Solution implementation

Five slugs (`contractors-home-services`, `creative-marketing`, `professional-it-services`, `photo-video-events`, `custom-fabrication-signage`) on dynamic routes, with a file-commented marketing-only type mapping. Feature pages cover six capabilities. No product code consumes solution slugs. Target state is six solution pages aligned to six packs; legacy URLs must be verified and preserved or redirected (old `photo-video-events` must redirect, never 404).

### 0.6 Current AI seams

Opaque-`contextText` draft/improvement prompt builders; grounded context assembly (inquiry + scope-only knowledge + pricing candidates + revision/current/existing); lexical currency-exact pricing retrieval with server-side price hydration; draft verification/repair that zeroes unauthorized prices; server-computed readiness; missing-info normalization; business-scoped cache keys with source-version fingerprints; agent (visitor-approved commit) and assistant (confirmation-gated, role-checked writes). `businessType` is selected into the assistant context and then discarded — the exact injection seam.

### 0.7 Current customization

Custom fields, per-service forms + page configs, branding, library/quote/email templates, knowledge + shared business instructions, follow-up configuration, inquiry attachments, business settings. Statuses, pipelines, and lifecycles are not configurable.

### 0.8 Existing constraints

Manual-payments-only, app-level business scoping, confirmation-gated AI writes, draft-only quote editing, accepted-quote immutability, one-active-invoice-per-quote, entitlement flags, usage quotas, no silent AI paths.

### 0.9 Current tests

Unit, integration, and end-to-end coverage for quote schemas/utils/acceptance/tokens/mutations/actions, follow-ups, invoice/payment lifecycle and state, AI (missing-info, cache, catalog, usage, capacity, sanitizer, output filter, router, embeddings, budgets, agent session/telemetry/isolation), plans/billing/webhooks, analytics, and inquiry submissions. New work extends these patterns; no new harnesses.

### 0.10 Known contradictions

Solutions imply per-vertical pipelines the product lacks; library `package` kind is pricing reuse, not project packaging; a `no_deposit_payment` cancellation reason exists with no deposit object behind it; `businessType` is loaded into AI context and discarded. Nothing in later phases may contradict these findings without explicit justification.

## 2. Phase 1 — Product Strategy

Vertical-aware inquiry-to-quote SaaS; approval + scope protection as the signature mechanism inside that product. Differentiation: Requo natively understands *what must be approved per trade* while competitors converge on generic send→sign — evidenced by Jobber's amend-or-new-only change recovery with no native change-order object, reopen-resets-signatures editing patterns, awkward mid-project adds in creative CRMs, and shopVOX proving version-locked proof approval cuts reprints. Taxonomy: fifteen stored types, six packs, secondaries configuration-only. Five primitives. AI boundary: three additive injections. Additive migration. Lagging marketing. Full user stories, testing principles, out-of-scope, and invariants are defined in the sections below. No schema is prescribed in Phase 1.

## 3. Phase 1 — Taxonomy & Behavior Packs

Stored values remain valid indefinitely and are never deleted, renamed, or destructively remapped. Pack assignment: `contractor_home_improvement` + `repair_services` → Contractors & Home Services; `creative_marketing_services` → Creative & Marketing; `web_it_services` + `consulting_professional_services` → Professional & IT (shared pack, separate SOW templates); `photo_video_production` → Photo & Video; `event_services_rentals` → Events & Rentals; `print_signage` + `fabrication_custom_build` → Print, Signage & Fabrication. Secondary types (`cleaning_services`, `landscaping_outdoor_services`, `moving_relocation`, `auto_services`, `pet_services`, `general_project_services`, the last also serving as fallback) receive intake presets, starter/library/email templates, and follow-up recipes only — no new domain objects; graduation requires evidence-based review. Pack switching re-seeds editable defaults and never touches history.

## 4. Phase 1 — Shared Primitives

**P1 Approvals.** One concrete table; subject discriminator `proof | final-count | asset | milestone | hold-confirmation`; lifecycle `pending → approved | changes_requested | superseded | expired`; explicit chain identity shared by all versions in one logical sequence; artifact reference one-directional (artifacts exist independently; approvals point at them); requester/approver; timestamps; comments; snapshot/hash following the acceptance-record precedent; shared notification/reminder/activity/audit rails; per-kind differences as versioned recipe data. Append-only; supersession, never un-approval. Subject targets are contractually defined (proof→versioned artifact; final-count→versioned commercial state; asset→versioned reviewable asset; milestone→schedule milestone; hold→date-hold context of the relevant inquiry/quote/workflow) — never arbitrary polymorphic pointers, never five tables, never a universal abstraction.

**P2 Change Orders.** Append-only child of the accepted quote, covering quote lines, structured scope blocks, and commercial schedule components: reason, affected targets, added/removed quantities, price and schedule deltas, risk, dependencies, evidence, customer-facing explanation, approval, actor, timestamps, version. Parent quote, accepted scope blocks, and accepted schedule remain immutable; derived current commercial state across all three components; drafts and rejections commercially inert.

**P3 Scope Blocks.** Ten typed kinds (`deliverables`, `exclusions`, `assumptions`, `allowances`, `revision_cap`, `acceptance_criteria`, `usage_rights`, `client_responsibilities`, `timeline`, `payment_schedule`). Structured commercial scope — not legal advice, not a contract generator, not CLM. States `required | optional` × `complete | incomplete | waived`; waiver is manager-or-above, audit-logged, and pinned at acceptance. Display, validate, warn; gate sending only where a pack declares criticality; version with quotes; feed AI context. Nothing mandatory globally.

**P4 Intake Packs.** Criticality (`critical | normal | optional`) + downstream bindings (readiness, approval requirements, supported quote/schedule/existing-follow-up behavior) + AI contract — layered over existing fields and forms, never a second field system. Phase 1 bindings target Phase 1 capabilities only: no calculated deadlines, countdowns, working-back scheduling, questionnaire timing, production schedules, automated future reminders, inventory, kitting, or SKU quantities. Guest count may drive readiness, final-count approval, and already-supported commercial calculations — never inventory-backed behavior. Binding vocabulary is closed and declarative; unknown binding kinds fail closed; unknown/invalid references on critical fields fail closed (affected readiness rule evaluates to blocked; offending recipe version cannot activate).

**P5 Commercial Schedules.** Quote-side representation of deposit/milestone/balance/retainer items (percentage of quote total or fixed amount, due date, due condition, ordering, state). Customer-visible, snapshot on acceptance, manual-invoice-prefill source (prefill always resolves the latest approved schedule version). No money movement, no reconciliation, no payment application, no invoice linkage in Phase 1. Accepted schedules are immutable historical truth; material post-acceptance changes produce a new approved commercial state through Change Orders (schedule v2 derived on CO approval), never an in-place edit.

## 5. Phase 1 — AI Strategy

One shared system; no separate models, routers, or pricing authority. **(a)** Pack guidance (terminology, scope rules, completeness expectations, package concepts, missing-info guidance) injected into grounded-context assembly; prompt builders unchanged, prompt version bumped. **(b)** Per-pack missing-information criticality (fabrication: dimensions/substrate/finish; photography: date/coverage/location) through existing normalization and server readiness. **(c)** Pack and guidance versions in cache invalidation. Historical AI outputs remain attributed to the version under which they were generated; regeneration is a new generation event using current versions and never rewrites prior outputs. Prohibitions: library-only pricing with zeroed model prices hydrated server-side; no silent send/price/mutate; confirmations intact; instructions (owner voice) and guidance (product data) separate; fallback type resolves to the actual form pack. Deferred: retrieval weighting/scoring, routing variants, analytics grouping.

## 6. Phase 1 — Migration & Compatibility

Strictly additive, in eight steps: (1) add schema; (2) deploy NULL-tolerant readers; (3) deploy resolver/config infrastructure; (4) seed pack assignments; (5) seed recipe v1; (6) verify; (7) enable pack-aware behavior; (8) verify again. Existing businesses, services, forms, inquiries, quotes, invoices, snapshots, and accepted artifacts are untouched; legacy types are never destructively normalized; no existing form is replaced by a pack form. Reset-to-default is user-initiated configuration behavior. Structural evolution uses expand → migrate → contract. Pre-migration records stay legacy/unpinned and are never reinterpreted; post-migration records pin behavior-affecting versions (pack, intake, scope/approval/schedule recipes, AI guidance, readiness rules — never every setting). Pack-aware behavior begins with newly created records; no retroactive migration in Phase 1. Rollback means disabling newly activated behavior while preserving newly created rows — never destructive down-migration of history.

## 7. Phase 1 — Testing Principles

External behavior only — never table names, helper names, or prompt strings. Approval transitions and customer-visible effects; change-order immutability with derived-state accumulation across lines, blocks, and schedules; scope gating including waiver semantics; readiness outcomes including critical-field fail-closed; schedule rendering/prefill/immutability including v2 derivation; AI outcomes on missing-critical inputs. Adversarial-first: stale-version approval; post-approval change without new version; accepted-schedule edit attempts; incoherent schedules (bad percentages, negatives, missing due conditions, quote-total mismatch); pack-switch stability with pinned vs legacy contexts; legacy immunity; silent-AI fail-closed; accept/revision races; idempotent manual payments. Migration: pre-existing checksums unchanged, forms untouched, defaults present and editable, reset scoped to config. Event: guest count affects readiness and supported calculations, never inventory or kitting. Approval targeting: valid targets resolve, invalid types/references rejected, no arbitrary IDs.

## 8. Phase 1 — Out of Scope

Payment processing and money movement; payment application/reconciliation/linkage; SKU inventory, barcodes, packing, subrentals, warehouses; inventory-backed availability/allocation/guarantees/auto-resolution (conflicts or scheduling); package/kitting expansion; dispatch, GPS, routing, crew scheduling; Gantt, PM, time tracking; supplier live pricing; aerial measurement; color management, imposition, machine scheduling; gallery/delivery platforms; per-vertical AI models; silent AI commercial actions; knowledge-as-price-source; per-vertical dashboards, status pipelines, cosmetic themes; universal abstractions; arbitrary polymorphic approval references; invoice-model changes; mutating or un-approving history; retroactive pack reinterpretation or form rewrites; Deadline Engine behavior in Phase 1 packs; anything existing configuration already achieves.

## 9. Phase 2 — Domain Model

For each primitive: entity shape, ownership, lifecycle, mutation rules, versioning, historical behavior, authorization, and interactions with inquiries/quotes/follow-ups/invoices/notifications. P1: subject-target contracts with referential safety, explicit chain identity, one-directional artifact relationship, recipe schema + versioning, expiry/supersession rules, customer token scope. P2: parent relation without history-destroying deletes, line/block/schedule deltas by stable identity, delta currency rules, P1 approval linkage (locked), concurrency policy, derived-state computation across all three components. P3: block registry, per-block requiredness sourced from packs, required/optional × complete/incomplete/waived states, ordering, owner/customer visibility, validation, rendering contracts, versioning. P4: pack + version entity, field-binding registry, criticality evaluation order with critical fail-closed, recipe relationships, defaults editing, switch semantics. P5: schedule + items, amount/% exclusivity with quote-total percentage semantics, due-condition vocabulary, ordering, display-only due states, snapshot inclusion, prefill contract resolving the latest approved version, immutability + CO-derived new states. Cross-cutting: business isolation, keys, uniqueness, indexes, constraints, concurrency, audit before/after, authorization matrix, deletion/archival policy. No elegance abstractions.

## 10. Phase 2 — Database Architecture

Concrete DDL per §9: tables, columns, types, enum strategy following the existing native-enum convention, foreign keys with history-preserving delete rules, uniqueness (per-chain approval identity mirroring the acceptance unique pattern; partial unique indexes for single-active-row enforcement, following the existing partial-index precedent), lookup/version indexes, CHECKs (percentage totals, non-negative deltas, single-target integrity, amount/% exclusivity), additive-first migration sequence with expand → migrate → contract where unavoidable, backward-compatible deploy order.

## 11. Phase 2 — Backend Architecture

Actions (auth context, rate limits on public approval endpoints mirroring quote-response limits), queries (list/detail/version/history, pack-version-aware reads), mutations (transactional writes + activity/audit), API routes (token-scoped public approval with replay protection), schemas (existing zod patterns, allowlist-validated recipe config), domain helpers (derived-state, readiness, schedule validation), per-boundary authorization (membership + customer token + expiry). Entitlement review against the fifteen existing flags and usage quotas (e.g. approval email volume vs quote-email quotas) — no silent billing changes.

## 12. Phase 2 — Frontend Architecture

Settings pack management, approval center views, public approval pages reusing public-quote patterns, approval timelines, change-order composers, scope-block editors, schedule builders, criticality indicators; forms/dialogs with backend-parity validation; customer approve/request-changes and schedule display; pack-aware onboarding copy and defaults; empty/error/loading states; print/PDF inclusion. One-shell rule: pack differences via configuration-driven copy/ordering/gates, never forked screens.

## 13. Phase 2 — AI Architecture

Pack-guidance section builder with version stamping; prompt version-bump mechanics; cache-key extension and recipe-change invalidation; criticality evaluation order with fail-closed unknown versions; per-pack missing-info label sets preserving dedup; single business-type→pack resolution choke point with general fallback. Historical outputs keep original version attribution; regeneration adopts current versions as a new event. Enumerated prohibition enforcement points (hydration, confirmations, roles).

## 14. Phase 2 — Jobs / Notifications / Analytics

Approval expiry sweeper targeting specific version rows (never a newer version); reminder cadence reusing follow-up patterns with decided/superseded/expired exclusion; hold-expiry transitions that change hold state only and never assert availability; display-only schedule due states; derived-state repair via read-path + cron (expiry-sync precedent). New notification types following the states/reads pattern (in-app/push/email triples per existing flag convention, LOW_EMAIL_MODE and quotas respected, customer-triggered events attributed as customer actions with null business actor per quote-response precedent), plus push events. Analytics events (approval completion/time/changes/stale rates; change-order frequency/approval/delta value; schedule usage/acceptance/prefill corrections; AI usefulness/edit/readiness/false-positive/use-by-pack) with rollups; no businessType grouping unless separately approved.

## 15. Phase 2 — Migration Design

Exact 8-step ordering (§6); seed inserts → nullable columns → backfill-free activation → verification (row checksums, form-config equality, acceptance-hash re-verification). Rollback is feature-off, never destructive. Reset scoped to config tables.

## 16. Phase 3 — Implementation Plan

Repo-level work breakdown per §§9–15: workstreams with files discovered at plan time (expected zones: new feature modules mirroring existing layout; extensions to quotes/invoices/follow-ups/notifications/analytics/AI/agent/assistant/settings/onboarding/businesses; schema + migrations; business and public routes; marketing components; email templates), acceptance criteria per §7, and a per-workstream anti-drift statement (why config can't solve it, why not a field, workflow unlocked, verticals, phase, exclusions, drift risk).

## 17. Phase 3 — Dependency Graph

```text
 PHASE 0 audit → PHASE 1 strategy → PHASE 2 domain/architecture
 → PHASE 3 implementation spec → PHASE 4 build → PHASE 5 QA
 → PHASE 6 security/perf → PHASE 7 rollout → PHASE 8 migration
 → PHASE 9 marketing → PHASE 10 measurement → PHASE 11 decisions
```

Primitive edges: P4 → readiness + AI criticality; P3 → approval-readiness gates; P1 → P2 approval mechanism (locked: P1 instances); P5 → Phase 2 invoice linkage (no Phase 1 edge); recipes ← all five entity shapes; AI ← P4 registries; analytics ← event shapes; marketing ← shipped flags. Phase 2 candidates branch only from Phase 1 completion + evidence.

## 18. Phase 3 — File/Module Impact Map

Produced at Phase 3 time by inspection to avoid rot. Rule: extension over fork, shared conventions over new patterns.

## 19. Phase 3 — Test Plan

Traceability matrix from every §7 adversarial case to suite location (extending existing test files), fixtures, concurrency coverage, migration verification queries, performance smoke (detail/public/render/readiness/dashboard queries), security cases, and rollback drills. No implementation-detail assertions.

## 20. Phase 4 — Implementation Sequence

Gated on explicit authorization (not granted). Order: foundations → P4 → P3 → P1 → P2 → P5 → recipes → AI → UX → notifications/jobs → analytics → marketing. Shared primitive + configuration + recipes; per-type branching only where configuration is provably inexpressive, documented per instance.

## 21. Phase 5 — Verification & QA

Green suites, six pack walkthroughs end-to-end, adversarial/versioning matrix, migration validation on production-like snapshot, rollout-readiness report. Done means outcomes, not coverage percentages.

## 22. Phase 6 — Security / Performance / Operability

Tenant isolation on every new query; customer-token scoping/expiry/replay resistance (possession grants exactly the linked operation, nothing broader); signed artifact URLs; IDOR sweep on subject references; spoofing/stale-version/authorization/tamper cases; audit integrity. Idempotent public actions; duplicate-notification guards; job reprocessing safety; concurrent-action races; partial-failure semantics. N+1 audits; readiness/context budgets. Error/log/audit catalogs; job-failure alerting; migration verification dashboards.

## 23. Phase 7 — Release & Rollout

Dev → preview → internal → controlled production → existing → new → full, using existing enablement mechanisms only (no new flag platform without justification). Per feature: default state, enable criteria, rollback, monitoring, owner, flag cleanup. Legacy marketing URLs verified first; renames get 301s, never 404s.

## 24. Phase 8 — Existing Customer Migration

Execute the §15 plan; assignment plus additive seeds; forms and history legacy-stable; new customers on current defaults; edits/switches/resets future-only. Verified independently of rollout.

## 25. Phase 9 — Marketing & Documentation

Post-ship only: six solution pages to the shipped-behavior standard, feature pages, onboarding/help/guides/screenshots, `llms.txt` and agent docs. Banned claims: future/Phase 2 behavior, inventory/availability guarantees, payment processing, unshipped workflows. Each page: current capabilities + configuration + shipped vertical behavior.

## 26. Phase 10 — Post-Launch Metrics

Inquiry completion/qualification/readiness; time-to-quote, send/view/accept/revision/change-order rates; approval completion/time/changes/stale rates; schedule usage/acceptance/prefill-correction rates; AI usefulness/edit/readiness/false-positive/use-by-pack; adoption by pack where privacy permits. Correlation is not causation.

## 27. Phase 11 — Phase 2 Candidate Evaluation

Ordered: Packages & Options; Deadline Engine; invoice linkage; photo-anchored lines; lightweight date/availability awareness expansion (never an engine); justified formula pricing. Each faces the ten-question differentiation test (limitation solved, workflow, why fields/templates insufficient, downstream behavior, packs, primitive-vs-config, funnel improvement, scope/revenue protection, drift check) plus an anti-drift statement. Nothing auto-promotes.

## 28. Risks & Tradeoffs

Recipe drift (contained by versioning + review diffs + pinning, not prevented); gate-overreach reading as enterprise rigidity (warn-by-default, block only on pack criticality); deliberate honesty gap while competitors ship approvals; photo/events split cost (shared hold recipe must stay shared); single-table polymorphism pressure (contracts + relational decision + IDOR tests); schedule-without-money confusion vs payment-conditioned competitors (agreement-to-pay-manually labeling, never pay buttons); Good/Better/Best expectations held until Packages; migration verification cost (sampling strategy).

## 29. Locked Invariants

1. Vertical-aware inquiry-to-quote SaaS. 2. Approval + scope protection as signature mechanism. 3. Fifteen stored types valid indefinitely. 4. Six packs govern behavior. 5. Secondaries configuration-only. 6. Exactly five Phase 1 primitives. 7. One approvals infrastructure table, constrained subjects. 8. Append-only approval history. 9. Supersession, never un-approval. 10. Immutable accepted quotes. 11. Immutable accepted schedules. 12. Append-only change-order deltas. 13. Derived current state. 14. Holds never become inventory or availability. 15. Packs reuse existing fields. 16. Packs add criticality, bindings, AI contracts. 17. No Deadline Engine in Phase 1 packs. 18. Schedules move no money. 19. No payment processing. 20. Version context pinned on pack-aware records. 21. Legacy never reinterpreted. 22. Forms never rewritten by migration. 23. History never destructively rewritten. 24. Library-only pricing authority. 25. No silent AI actions. 26. No per-vertical models. 27. No per-vertical PM. 28. No full inventory. 29. Lagging marketing. 30. Configuration over custom code for new verticals.

## 30. Final Definition of Done

Product: six packs + secondary profiles live; materially different feel per workflow; no vertical duplication. Domain: five primitives with explicit lifecycles, versioning, immutability, derived state. Engineering: safe schema, enforced permissions, jobs, AI seams, notifications, analytics. Migration: forms/records/accepted artifacts preserved; additive defaults; safe switching; stable legacy. UX: pack-aware onboarding/settings/quotes/approvals/change control; one-product feel. QA: suites, integration, adversarial/versioning, migration validation, security, performance. Release: controlled rollout, rollback, observability, flag cleanup. Marketing: pages match shipped behavior, no future promises, docs match implementation. Measurement: adoption + outcome metrics + review criteria exist.

---

# PART B — Phase 2 + Phase 3 Technical Specification

Evidence labels: **[Verified]** = confirmed in-repo by inspection · **[Vendor claim]** / **[Independent evidence]** = 2025–2026 external research · **[Inference]** = synthesis · **[Proposed]** = new design decision · **[Challenge]** = issue raised against the strategy with resolution. Zero implementation code; Gates 2–6 unapproved.

## B1. Technical Executive Summary

Five primitives land as concrete sibling domains on the existing feature-module pattern, reusing every load-bearing precedent the repo proves: token-scoped public actions (quote-response), unique-constraint concurrency guards (acceptance/payment/quote-number), append-only history (versions/acceptances), nullable-version legacy stability, entitlement-gated rollout (no flag platform exists — verified absent), cron + SKIP-LOCKED jobs. Correction pass C1 resolved the remaining structural risks: **one-directional artifact relationship** (artifacts exist independently; approvals point at them); **explicit chain identity** shared by all versions in a sequence; **Change Order coverage across lines, blocks, and schedules** with derived state over all three; **the legacy rule** (new pack-aware children on legacy parents; send-time current validation for legacy drafts); **schedule acceptance mechanics** (v1 immutable, v2 via approved CO, prefill resolves latest approved); **five locked technical decisions** replacing open questions, plus seven further locked decisions (chain identity, subject targeting, artifact direction, waiver, legacy/switch semantics, binding failure, AI versioning) for twelve total.

## B2. Verified Repository Baseline

**Entities [Verified].** Inquiries family; quotes family (+`quote_acceptances` unique per quote+version, snapshot+SHA256); follow-ups (`manual|automatic`); invoices + manual payments (`PAY-YYYY-NNNN` counter PK, void-only corrections); businesses (plan text+check, `businessType` default general); per-form `businessType`; library kinds `block|package|template`; 12 notification types with watermark+explicit reads; 2 analytics event types with 10s visitor dedupe; 15 entitlement flags; 17 usage-limit keys; idempotent Polar webhooks. **Absent (grep-verified):** approvals, change orders, milestones, deposits, schedules, holds, Good/Better/Best, per-vertical anything.

**Transactions [Verified].** Acceptance: single `db.transaction`, no `FOR UPDATE` — token lookup → optimistic `expectedVersion` (accept-only) → on-read expiry → status-gated idempotency → server-authoritative item re-select → snapshot/hash → unique-guarded insert with winner re-read → status update → inquiry-to-won + follow-up skips → activity always / audit on accept only / gated notification; post-commit follow-up close in a **separate** transaction (deadlock-avoidance precedent). Payments: idempotency pre-check → invoice `FOR UPDATE` → guards → counter-atomic numbering → insert → `23505` replay catch. `FOR UPDATE` exists only in invoice lifecycle + AI/agent confirmation consumption.

**Public security [Verified].** 20-char CSPRNG tokens (~120-bit) with plaintext+HMAC pair and documented SEC-018 tradeoff (recoverable owner links; DB-read⇒bearer mitigations: direct-Drizzle-only, deny-all RLS, no tokens in lists/logs); possession-only auth; fingerprinted public rate limiter (fail-closed) already applied to quote respond/revision actions; no token TTL (validity from `validUntil` + reconciliation). Public writes use `actorUserId:null`.

**Auth [Verified].** Business: membership + weight-compared roles (`owner` 3 > `manager` 2 > `staff` 1) + active-record + plan overlay, `eq(businessId)` writes, 404 anti-enumeration; administration owner-only, operational settings manager+, workspace staff+. Customer: bearer token + rate limit + Zod, no session. Token possession grants exactly the linked operation — never broader business permissions.

**Conventions [Verified].** Drizzle barrel + `NNNN_snake.sql` (never edit committed SQL; anomalies: missing `0019`, duplicated `0021` — do not "fix"); `pgEnum` closed machines, text+check open strings; **partial unique indexes with `.where()` are established precedent** (active-invoice-per-quote, payment idempotency, sent-quote indexes); CHECK constraints precedent throughout; UUIDv7 entities, `prefixedId` correlation keys, human numbers via retry/counters; timestamptz + date-mode strings; soft-delete + orthogonal archive + terminal void; `businessId CASCADE` + app-side isolation; feature modules (`actions→mutations/queries/schemas/types/utils/components/jobs`); `React.cache` + `use cache` + tags; email outbox claim; `tests/unit|components|integration|e2e` tiers with per-file prefixes and residue guards. Starter workflows (`project_quote`, `recurring_service`, `consultation_proposal`) are onboarding field-pattern seeds — a separate concern from both BusinessType and BehaviorPack; the three concepts are never collapsed.

**Strategy↔repo conflicts.** (a) Six solution slugs assumed; five exist plus four legacy redirects — resolve by verify + 301-map, never 404. (b) No flag platform exists — rollout uses entitlement-gating + per-business booleans only. (c) Starter-template 15→6 collapse membership differs from pack membership — new `getBehaviorPack()` resolver; starter templates untouched.

## B3. Domain Model

Per primitive — Purpose / Aggregate root / Entities / Value objects / Relationships / Lifecycle / Invariants / Commands / Queries / Events / Authorization / Versioning / Deletion / Audit:
- **P1:** root `ApprovalChain` (identity) + `ApprovalVersion` rows carrying state; explicit `approvalChainId` shared by all versions in one sequence; subject reference, artifact pointer (one-directional), snapshot/hash value objects; business CASCADE; recipe kind+version pin; lifecycle §B4; exactly one non-terminal version per chain (partial unique); commands request/approve/request-changes/expire/supersede (new version); customer token view + chain history + pending inbox queries; transition audit with before/after; decided rows never hard-deleted.
- **P2:** root `ChangeOrder` under immutable parent, covering quote lines, scope blocks, and schedule components; line/block deltas (stable identity + snapshots), price/time deltas, risk/dependency value objects; `draft→pending_approval→approved|rejected|withdrawn|canceled`, superseded via new version; one pending per quote; derived-state-only effect across all three components.
- **P3:** block rows owned by quote, snapshotted with quote versions; typed content value objects; `required|optional` × `complete|incomplete|waived` (waiver: manager+, audit-logged, pinned at acceptance, hidden from customer view by default); kinds from closed registry; requiredness from pack recipe.
- **P4:** assignment + recipe versions as config (no commercial rows); criticality marks, closed-vocabulary bindings, AI label sets; version succession append-only. Binding evaluator maps (field, behavior-kind) to existing code paths — never executes logic; unknown binding kinds fail closed; critical-field invalid references fail closed.
- **P5:** schedule (one active per quote) + ordered items; amount (%-of-quote-total bps or fixed), due condition, computed cents; `draft→scheduled→(accepted snapshot)→superseded` via CO-derived v2; coherence at write; no money semantics.

## B4. P1 Approvals

Business creates (staff+) → chain created with version 1 `pending` (artifact + recipe + expiry) → customer token link → artifact view → approve (name attestation where recipe requires, typed-name precedent) or request-changes (comment required) → conditional-update transition on the exact version row (`WHERE chainId + version + status='pending'`; rowcount 1 = decided, 0 = re-read for idempotent replay). Stale versions rejected by version check (`expectedVersion` precedent). **New version** (resubmit after changes-requested/expiry, or new artifact after a decision) supersedes the prior version in the same transaction: prior → `superseded` with its `approvedAt`/history intact. Approved timestamps immutable; comments append-only rows; expiry extended only via new version. Reminders via `reminderSentAt` + recipe cadence, skipping decided/superseded/expired rows. Token: 20-char CSPRNG + HMAC per approval link, recipe `expiresAt`, existing public rate limiter, replay-safe conditional consume; possession grants exactly the linked approve/request-changes operation.

**Chain identity.** `approvalChainId` (immutable, UUIDv7) is created with the first version whenever a new approval subject is opened (new subject target, new parent commercial record, or new approval purpose). A new version — never a new chain — is created for resubmission, artifact revision, or expiry renewal of the same logical approval. A new chain is required for a different subject target or a different originating record. One non-terminal version per chain is enforced by partial unique index (established repo precedent).

**Artifact relationship (one-directional).** Artifacts exist independently; approvals reference them — never the reverse. Artifact record: business ownership (`businessId` CASCADE) + uploader actor; lifecycle `uploaded → attached → (superseded) → retained`; each artifact row immutable with `artifactVersion` + `supersededByArtifactId` self-reference for navigation only; deletion RESTRICTed while referenced by any approval row; unattached drafts deletable by the business pre-decision; private-bucket storage under `{businessId}/` prefix with signed-URL access through the token-scoped artifact route; SHA-256 recorded at upload; content-type/size policy reuses the inquiry-attachment validator choke point; tenant isolation via `businessId` on row and path. No deferred constraints, no cycle.

**Subject targeting — Option C (concrete nullable FKs + exactly-one CHECKs):**

| Kind | Subject target | Subject version | Artifact | Chain | Customer access | Lifecycle / expiry / supersession |
|---|---|---|---|---|---|---|
| proof | `artifactId` row | artifact row version | required | per proof opening | token link | recipe expiry; new artifact ⇒ new approval version |
| final-count | `quoteId` + versioned count snapshot | snapshot version on approval row | optional evidence | per finalization round | token link | recipe expiry; recount ⇒ new version |
| asset | `artifactId` row | artifact row version | required | per asset review | token link | recipe expiry; re-upload ⇒ new version |
| milestone | `scheduleItemId` (post-P5; recipes disabled before) | schedule item version | optional evidence | per milestone | token link | recipe expiry; rework ⇒ new version |
| hold-confirmation | `inquiryId`/`quoteId` + hold-context snapshot | snapshot version on approval row | none | per hold request | token link | hold-state expiry; re-request ⇒ new version |

No path permits an arbitrary unrelated UUID: each kind's CHECK enforces its allowed FK combination, all targets carry `businessId`, and cross-tenant references 404 by construction.

## B5. P2 Change Orders

Draft COs (many allowed) → submit acquires the single-`pending_approval` slot (partial unique; others wait) → customer delta view (original vs delta from snapshots, across lines, blocks, and schedule) → approve (locked: P1 instance, same token family) or reject → approved deltas join derived state; rejected/withdrawn/canceled inert. **Coverage:** quote lines (add/modify/remove/quantity via `quote_items.id` + denormalized snapshots), scope blocks (add/modify/remove/replace via block ID + snapshots), schedule components (add/modify/remove/reallocate via schedule item ID + snapshots; v1 immutable, v2 derived on approval). **Line identity:** stable IDs plus snapshots; new lines full payload. **Derived state:** scope = accepted items/blocks adjusted by approved deltas in (CO number, position) order; value = accepted total + Σ approved price deltas recomputed from line math (delta fields are display; recomputation is truth); schedule = latest approved version; 0 changes = accepted snapshot byte-identical. **Concurrency:** pending-slot partial unique + `baseQuoteVersion` check at approval (mismatch ⇒ rebase path, never silent apply).

## B6. P3 Structured Scope Blocks

Typed content per kind, e.g. `deliverables{items[{label, qty?}]}`; `allowances{items[{label, amountCents, brand?}]}`; `revision_cap{rounds, overageCents?, consolidationRule, deemedApprovalDays?}`; `acceptance_criteria{items[{criterion, reviewer?, responseDays?}]}`; `usage_rights{matrix[{media, term, territory}], carveouts[]}`; `payment_schedule{referenceSchedule:true}` (pointer to P5, no duplication); timeline milestones display-only (not the Deadline Engine). **Gating states:** `required|optional` × `complete|incomplete|waived`. Incomplete required blocks send (hard block, specific message). Waiver requires manager+, is audit-logged with actor/reason, and is pinned into the acceptance snapshot so later recipe changes cannot retroactively alter whether an accepted block was required. Waived blocks are hidden from the customer view by default (business view + audit retain them). Zod validation per kind, unknown keys rejected; customer read-only rendering; business editors + completeness; requiredness/criticality from pack recipes; inclusion in quote-version snapshots; AI representation as labeled text. No JSON dumping ground.

## B7. P4 Intake Packs

`BehaviorPack` code constant (key, label, member types, solution slug) → code pack version → per-business DB assignment → versioned recipe rows per kind, seeded from code defaults, owner-editable into new versions. Existing inquiry field kinds/IDs only. **Closed binding vocabulary:** `readiness | approval_requirement | quote_behavior | schedule_behavior | follow_up_behavior`, each mapped to exactly one existing code path in a single evaluator. **Safety:** config rows contain data only — never executable code, function names, SQL, query instructions, or route references (Zod allowlist-validated at write). Unknown binding kinds fail closed (recipe version refuses activation, logged). Unknown/disabled/deleted references on optional fields: skipped with warning. Unknown or invalid references on critical fields: fail closed — the affected readiness rule evaluates to blocked and the offending recipe version cannot activate — so a deleted critical field can never make a record look quote-ready. Anything else is a custom field — rejected.

## B8. P5 Commercial Schedules

One active schedule per quote; ordered items in `deposit|milestone|balance|retainer`. Amounts fixed-cents XOR percentage, where **percentages are always percentages of the quote total** (single semantic model — never of remaining balance). Coherence at write: all-fixed Σ == quote total; all-percentage Σ == 10000bps; mixed: fixed-Σ + Σ(percentBpsᵢ × quoteTotal / 10000, floored per item in position order, remainder to the last percentage item) == quote total. Integer basis points throughout, never floats; `computedAmountCents` stored per item and re-verified at acceptance; the accepted snapshot preserves the exact customer-visible computed cents. Due dates/conditions representational (display + prefill ordering), never triggers. Acceptance snapshots schedule JSON; prefill maps items → draft invoice lines 1:1 for owner review **always resolving the latest approved schedule version**. Post-acceptance change = CO-only mechanism: the CO references the schedule version it modifies; on approval, schedule v2 is derived/created while v1 remains historical truth. No money/allocation/reconciliation/linkage — enforced by absence plus tests.

## B9. Versioning Model

| Configuration | Must pin? | Why? | Where? |
|---|---|---|---|
| Pack version | Yes | selects all behavior | assignment row + stamped on pack-aware records |
| Intake recipe | Yes | readiness/gates | recipe version stamped on evaluated records |
| Scope recipe | Yes | requiredness/gating (pinned at acceptance) | stamped at send + version snapshots |
| Approval recipe | Yes | validation/expiry/cadence | kind+version on approval rows |
| Schedule recipe | Yes | coherence/validation | stamped on schedule rows |
| AI guidance | Yes | draft content | cache fingerprint + AI outputs (historical outputs keep original attribution) |
| Readiness rules | Yes (with pack) | gate outcomes | covered by pack+intake pins |
| Email copy/templates | No | mutable preference | — |

Behavior version ≠ mutable preference. Reconfiguration versions forward; history never rewritten. Cache invalidation joins pack/guidance versions (no global invalidation). **Explicit rule:** a legacy record participates in a new post-migration workflow only through newly created pack-aware child/version records; the legacy parent retains its original semantic context and is never retroactively reinterpreted. A legacy draft quote sent after migration is evaluated under current validation as an explicit new send action — its historical draft state stays legacy. Sent/accepted parents stay immutable/legacy while new children pin current context.

## B10. Legacy Record Model

| Record type | Pre-migration | After migration | New primitive attach? | Pack context |
|---|---|---|---|---|
| Inquiry | legacy, frozen | unchanged | Yes — new child rows pin **current** context at action time | parent legacy; children current |
| Draft quote | legacy draft state | editable; explicit send evaluates **current** gates | Yes | send-time evaluation; history untouched |
| Sent/accepted quote | legacy, immutable | immutable | COs/approvals attach pinned-current; parent untouched | parent legacy; children current |
| Invoice/payment | legacy | unchanged | prefill into **new** draft invoices only | read-only source |
| Follow-up | legacy | unchanged | bindings on **new** follow-ups only | creation-time pin |

New UI may render old records (read paths version-tolerant: NULL ⇒ legacy branch). Historical interpretation never changes.

## B11. Pack Switching

Append-only assignment history; future-only effect. In-flight records keep pinned/legacy context — including owner edits after switch (validated against pinned context, banner states originating pack version). New records use the new pack. Evaluations log the pack version used; mismatches fail closed to legacy behavior. No silent drift.

## B12. Database Schema

Conventions per §B2 (UUIDv7 PKs, `businessId CASCADE`, timestamptz, soft-delete where customer-visible, `pgEnum` closed sets, partial unique indexes and CHECKs as established precedent). New tables: `business_pack_assignments` (business-unique, pack text+check of 6, packVersion, source, timestamps, history retained); `pack_recipes` (pack, kind `intake|scope|approval|schedule|ai_guidance`, version, effectiveAt, active, config JSONB kind-validated with executable-content allowlist; unique(pack,kind,version); append-only, transactional activation; immutable once referenced); `approval_chains` (chain UUIDv7 PK, business, subjectType enum(5), subject FKs per §B4 contract + exactly-one CHECK, created actor/timestamps); `approvals` (chain FK, version int, supersedes-approval self-FK nullable, artifactId FK → artifacts RESTRICT, recipeKind+recipeVersion, state enum, requester/approver, expiresAt/reminderSentAt/decidedAt, snapshot+hash, customer link hash; unique(chain,version); partial unique one non-terminal per chain; inbox/history/link indexes); `approval_artifacts` (business, uploader actor, storagePath/ContentType/size, artifactVersion, sha256, supersededByArtifact self-FK navigation-only, timestamps; **no approval FK — one-directional**); `change_orders` (business; immutable quoteId FK; per-quote sequence + display number; state enum; baseQuoteVersion; reason/explanation/risk/dependencies; deltas; actor/timestamps; partial unique one pending per quote); `change_order_lines` (CO FK; targetKind `line|block|schedule_item`; target refs + snapshots; add/remove/modify flags; payloads; position); `quote_scope_blocks` (business; quote FK CASCADE; kind enum(10); position; typed content; required bool; state `complete|incomplete|waived` + waiver actor/at/reason; unique(quote,position)); `commercial_schedules` (business; quote FK unique-active; version; state; display totals with recompute verification) + `commercial_schedule_items` (schedule FK; position; category enum; amountType; amountCents/percentBps with one-null CHECK; computedAmountCents; dueDate/dueCondition; state; unique(schedule,position)). Readiness pins as nullable stamp columns (NULL = legacy). Notification enum +6 with matching in-app/push/email flag columns (in-app default true, push default false per existing convention); analytics event types extended. Existing tables gain nullable stamps + enum values only (expand-only).

## B13. Migration Strategy

Eight steps: (1) add schema; (2) deploy NULL-tolerant readers; (3) deploy resolver/config infrastructure; (4) seed pack assignments from stored type via new resolver; (5) seed recipe v1 from code defaults; (6) verify (row checksums, form-config equality, acceptance-hash re-verification); (7) enable pack-aware behavior; (8) verify again. Rollback = deactivate (artifacts inert; history intact; no destructive down-migration of commercial history). Expand→migrate→contract reserved for incompatible evolution (none planned).

## B14. Backend Architecture

Command-specific mutations only (no generic CRUD): approval request/approve/request-changes/expire/supersede (new version); CO draft/submit/approve/reject/withdraw; block upsert/waive; schedule create/edit/prefill; pack switch/reset; recipe edit/activate. Business mutations follow `*ForBusiness` + transaction + audit/activity/notification; public mutations follow token + rate-limit + Zod + conditional-write. Queries business-scoped and tag-cached. Full per-action contracts (input/auth/validation/transaction/side-effects/idempotency/errors) enumerated in work items (§B32).

## B15. Public Customer API/Flow

Token link → scoped artifact view (signed URLs) → approve (attestation where required) / request-changes (comment required) → confirmation of decided state; replay returns state, never double-writes. CO delta view → approve/reject → confirmation. Schedule display-only with agreement-to-pay-manually labeling, zero payment controls. Expired approvals terminal with business re-request path. Rate-limited, version-checked, logged, tenant-isolated throughout. Token possession grants exactly the linked operation — nothing broader.

## B16. Business/Admin API/Flow

Membership-authenticated operations with §B17 gates: create/edit/supersede/cancel/switch/reset/recipe-edit/audit-view, derived-state views, customer-link issuance. Admin reuses existing admin patterns; no new admin model.

## B17. Authorization

| Operation | Owner | Manager | Staff | Customer | Job |
|---|---|---|---|---|---|
| Pack switch / recipe activate | ● | ○ | ○ | ○ | ○ |
| Recipe edit (new version) / reset defaults | ● | ● | ○ | ○ | ○ |
| Create approval/CO/schedule/blocks | ● | ● | ● | ○ | ○ |
| Approve on behalf / cancel CO / supersede (new version) / waive required block | ● | ● | ○ | ○ | ○ |
| Respond to own approval/CO | ○ | ○ | ○ | ● token (exact linked operation only) | ○ |
| View audit | ● | ● | ○ | ○ | ○ |
| Expiry/reminder sweep | ○ | ○ | ○ | ○ | ● |

Verified against role semantics (owner: full incl. administration; manager: day-to-day ops and workflow settings; staff: inquiries/quotes, no admin): pack switching and recipe activation are administrative (owner-only, `canManageBusinessAdministration` precedent); recipe editing is operational configuration (manager+); waiver is sensitive commercial judgment (manager+); audit viewing stays manager+. Existing membership/scoping helpers reused; no second model. Customer token scope is confined to the single linked approval/CO response and cannot reach business operations, other records, or other tenants.

## B18. AI Architecture

Resolver: stored type → pack (new choke-point; unknown/legacy → general) → version → guidance builder → grounded-context injection; prompt builders untouched, prompt version bumped. Cache fingerprints gain pack+guidance versions; recipe edits invalidate affected packs only. Readiness: pack criticality → missing-info labels → server gate, fail-closed on unknown version (affected rule evaluates to blocked). Per-pack missing-info label sets preserving dedup. Agent required-field overlays on the extractor. Guidance ≠ instructions (separate sections). Pricing server-authoritative; prohibitions enforced at hydration/confirmation/role checkpoints.

## B19. Notifications

New types `approval_requested/approved/changes_requested/expired`, `change_order_created/decided` (decision in metadata, accepted/rejected precedent). Each specifies: in-app (new `notify_in_app_on_approval` / `notify_in_app_on_change_order` flags, default true) + push (new `notify_push_on_*` flags, default false per existing push convention, plus deployment kill-switches) + email (existing providers/templates, LOW_EMAIL_MODE aware, volume against existing quotas) + activity + audit with accurate actor identity (customer-triggered events attributed as customer actions with null business actor, quote-response precedent — never impersonating business users). Dedupe via status-gated sends + reminder timestamps; retries idempotent (same record+version+transition ⇒ same content, safe to re-send). No new notification system.

## B20. Jobs

Approval expiry sweeper (daily, paginated, SKIP LOCKED) targets exact version rows (`WHERE chainId + version + status='pending'`-equivalent), so a newer version is never expired by mistake; idempotent via status gates. Reminder job (per-recipe cadence, `reminderSentAt` dedupe, business flags respected) skips decided/superseded/expired rows. Hold-expiry transitions change hold state only and assert nothing about availability, capacity, or conflicts. Races between job and customer response resolve deterministically through conditional updates (rowcount decides; loser re-reads), consistent with quote-response precedent. No schedule reconciliation job (pure display derivation). No stale auto-resolution (remind, never decide). No cleanup jobs (history immutable). No Deadline Engine.

## B21. Analytics

Phase 1 events: `approval_requested/viewed/approved/changes_requested/expired`, `change_order_created/approved/rejected`, `schedule_created/accepted/prefill_used`, `scope_block_added/required_missing`, `readiness_blocked/completed`, `ai_pack_guidance_used/missing_info_detected`. Each specifies actor (user/customer-anonymous/job), business, record refs, properties (pack/recipe versions, subject kind; no new PII beyond precedent), visitor-hash privacy, 10s dedupe precedent, aggregation via existing rollups where a metric needs it else event-level queries. No new reporting dimensions; no businessType grouping without separate approval.

## B22. Entitlements

Primitives usable on **all plans** (quote-flow core, library/follow-ups precedent); recipe customization Pro+ (depth-gating precedent: `emailTemplates`/`inquiryPageCustomization`). One new key proposed: `customWorkflowRecipes` (Pro+) enforced at recipe-edit/activate with ActionGate UX and upgrade messaging — justified solely because usage quotas cannot express customization depth. No new counters (volume accrues to existing email/AI quotas). No tier changes, no silent billing alterations.

## B23. Frontend / UX

One shell; pack differences via configuration + ordering + recommended sections + contextual actions. Per-pack defaults: onboarding suggestions (non-breaking copy + starter fields), inquiry criticality indicators, recommended scope blocks, recommended approval kind per context, inline change-control rules, recommended schedule structures. Customer pages link-scoped with confirmed-state rendering. Settings: pack switch (future-only warning), reset (config-only warning), Pro-gated recipe editors. Empty/error/loading states per flow; print/PDF includes approvals/schedules/blocks.

## B24. Six Behavior Packs

Each pack specifies recommended intake + criticality, scope recipe, approval recipes, schedule recipe, and AI guidance — configuration only, no bespoke schema:
- **Contractors:** site-readiness bindings; exclusions/allowances recipe; scope approval recipe; written-before-work CO rules; deposit/progress schedule recipe. No dispatch/routing/estimating-engine/supplier/crew.
- **Creative:** deliverable + revision-cap recipe; consolidated-feedback asset approval recipe; amendment CO rules; split/retainer schedule recipe. No agency PM/resource/time/production.
- **Professional/IT:** technical SOW recipe; milestone/UAT approval recipe (enabled post-P5); impact-assessed CO rules; milestone-weighted schedule recipe. No Jira-like PM.
- **Photo/Video:** coverage/deliverable/rights recipe; lightweight hold recipe; package/date approval recipe; retainer/balance schedule recipe. No gallery/editing/CRM/calendar; questionnaire timing stays Phase 2.
- **Events:** event-readiness bindings; hold recipe; final-count approval recipe with balance recalculation; logistics blocks recipe. Count drives readiness/approval/supported calculations — never inventory/kitting/SKU/allocation. Packages stay Phase 2.
- **Fabrication:** spec-lock + dimension/material/finish recipe; versioned proof approval recipe with production-readiness state; spec-change CO rules; deposit/balance schedule recipe. Formula pricing Phase 2; no machine/color/imposition/ERP/feeds/inventory.

## B25. Test Architecture

Requirement→behavior→type→suite, new files only where necessary. Priority: state machines, security (IDOR/token/replay/tenant), immutability (snapshots/hashes/checksums), concurrency (slot/version/unique races), migration (pre/post verification), public flows, derived-state correctness, AI safety (fabricated price, silent action, stale guidance, cross-business retrieval, poisoning). Extend existing tiers + fixtures + residue guards; no coverage-percentage chasing.

## B26. Adversarial Test Matrix

Approval: stale/duplicate/expired/superseded/unauthorized/cross-tenant/forged-subject/post-hash artifact change/repeated changes/race; chain cross-talk (version applied to wrong chain rejected); dangling artifact reference rejected. CO: rejected/draft affecting totals, double approval, concurrent COs, parent mutation, wrong/deleted line identity, block/schedule target mismatch, quantity overflow, currency mismatch, snapshot mutation. Schedule: >100%/<100%-where-invalid/negative/duplicate-order/missing-condition/amount mismatch/accepted mutation/unapproved change/bad prefill; v1-vs-v2 prefill resolution. Scope: incomplete-required send attempt, unauthorized waiver, waived-block customer visibility, requiredness change across recipe versions vs pinned acceptance. Pack: unknown/legacy/invalid pack, mid-flight switch, deleted recipe, version mismatch, stale config, disabled-field references; critical-field invalid reference fails closed; unknown binding kind refuses recipe activation. AI: fabricated price, silent send/mutate, stale guidance, unknown critical field, cross-business retrieval, context poisoning, unauthorized action; regeneration version attribution. Migration: counts/keys/hashes/forms/snapshots/totals/payments/types/behavior/config-presence; legacy immunity.

## B27. Security Review

Tenant isolation per query; token scoping/expiry/replay; signed artifacts; IDOR matrix (A approves B's artifact ⇒ 404); rate-limit bypass attempts; audit integrity (attribution, no PII beyond precedent); approval-spoofing (attestation bound to version+hash); CO authorization (customer token ≠ business rights); schedule tampering (conditional writes + version checks); job privilege (system-only); push-subscription scoping. Fail-closed defaults.

## B28. Performance Review

Filter/join/index/cardinality/pagination/tenant-scope/N+1 analysis per new query: approval history (chain-indexed), CO derived totals (bounded cardinalities; read-time compute specified — cached derived totals rejected as confusable with accepted totals; repair = recompute-on-read + inconsistency alert), pack/recipe lookups (cache-tagged, low cardinality), readiness (per-quote, request-memoized), AI context (existing budgets + guidance cap), public pages (single-token lookups), dashboard aggregates (rollup patterns reused; no new heavy aggregates). Indexes only with query reasons.

## B29. Documentation Updates

`docs/domain.md` (Approval/ApprovalChain/ChangeOrder/Schedule/Block/Pack/Recipe terms; lifecycles; derived-state rule), `docs/architecture.md` + `docs/data.md` (tables, invariants, isolation), `docs/workflows.md` (pack chains), `docs/ai.md` (guidance seams, version attribution, prohibitions), `docs/development.md` if commands change. Terminology: `BusinessType` (stored) vs `StarterTemplate` (creation seed) vs `Workflow` (3 values) vs `BehaviorPack` (behavior) vs `ConfigProfile`/`IntakePack`/`Approval`/`ApprovalChain`/`ChangeOrder`/`ScopeBlock`/`CommercialSchedule`/`Recipe`; retire ambiguous "starter template" and Service-lifecycle-enum language. README only if setup changes (it won't). Per-pack workflow guides post-ship.

## B30. File/Module Impact Map

| Domain | Existing (extend) | New (proposed zones) | Risk |
|---|---|---|---|
| DB | `lib/db/schema/*`, `drizzle/*` | new schema modules + numbered migrations | Medium (additive) |
| P1–P5 | — | `features/approvals|change-orders|scope-blocks|intake-packs|schedules` (actions/mutations/queries/schemas/types/utils/components/jobs) | Medium |
| Quotes | editor/detail/public/versions/acceptance/jobs | version-snapshot extension, gates, derived views | High (core) |
| Invoices | prefill target, activity | prefill mapping only (latest approved schedule) | Low |
| Follow-ups | recipes consume | suggestion hooks only | Low |
| Notifications | types/mutations/bell | 6 types + flag triples | Low |
| AI/agent/assistant | prompts/context/cache/tools | guidance builder, overlays, fingerprints | Medium |
| Settings/onboarding | pack UI, defaults | switch/reset/recipe editors, suggestions | Medium |
| Public routes | token patterns | approval/CO links, artifact route | High (security) |
| Analytics/jobs | events/rollups/cron | event types, 2 sweeper jobs | Low |
| Tests | all tiers + fixtures | matrix-mapped files only where needed | Low |
| Marketing | solutions-data, [slug] routes | 6th page + post-ship rewrites | Low (late) |

Proposed zones from the verified layout, not prescribed filenames; Phase 3 confirms by inspection.

## B31. Dependency Graph

Foundations/pinning → P4 → P3 → P1 (milestone recipes disabled) → P2 (P1-instance mechanism, locked) → P5 → milestone recipes enabled → vertical recipes → AI → UX → jobs/notifications → analytics → marketing. Recipes need entity shapes; AI needs P4 registries + fingerprints; analytics needs event shapes; marketing needs shipped flags; milestone approvals need P5 items.

## B32. Implementation Work Breakdown

Vertical slices (full per-item fields at execution planning): F-01 pack constants + resolver + assignment + migration + seed; F-02 recipe tables + seeding + activation + edit API; P4-01 bindings registry + evaluator + readiness integration (incl. critical fail-closed); P3-01 block registry + validation + editor/viewer + snapshots + gates + waiver; P1-01 chains + versions + token links + one-directional artifact store + conditional transitions; P1-02 per-kind recipes + reminder/expiry jobs + notifications; P2-01 CO CRUD + slot concurrency + line/block/schedule delta math; P2-02 P1 approval wiring + derived-state views; P5-01 schedules + coherence + snapshot + prefill (latest-approved resolution); P5-02 post-acceptance versioning via CO (v2 derivation); AI-01 guidance + fingerprints + overlays + criticality + version attribution; UX-01 pack defaults/onboarding/settings/customer pages; OPS-01 jobs/notifications/analytics/entitlements; MIG-01 seed/verify/rollback drills; MKT-01 six pages + docs (post-ship only). Each slice independently understandable; no giant "implement approvals" tasks.

## B33. Release Plan

Dev → preview → internal → controlled production → existing → new → full, via entitlement + per-business enablement (no flag platform exists). Per slice: default off, enable criteria (migration verified, suites green), rollback trigger (error-rate/audit anomaly), owner, monitoring, cleanup (enablement removed only after standard-behavior declaration; history tables never removed).

## B34. Rollback Plan

Per unit: disable behavior — new rows inert, legacy paths untouched (NULL-version branches preserved; no contract phase scheduled for history). Structures and data remain; customers continue on legacy flows with zero migration reversal. Irreversible by design: sent communications and decided approvals/COs (history). No destructive down-migrations of commercial history, ever.

## B35. Implementation Readiness Checklist

- **P1:** domain §B4 ✓ / chain identity + subject-target C locked ✓ / lifecycle+supersession ✓ / token+rate-limit+replay ✓ / additive migration ✓ / tests mapped ✓ / rollback (disable; rows inert) ✓ / UX states ✓ / deps (F-01/F-02) ✓ / artifact bucket decision locked (separate lifecycle).
- **P2:** domain §B5 ✓ / slot concurrency ✓ / identity+snapshots ✓ / derived math across lines+blocks+schedules ✓ / P1-instance mechanism locked ✓ / migration ✓ / tests ✓ / rollback ✓ / UX ✓ / deps (P1) ✓.
- **P3:** registry+validation ✓ / gating + waiver (manager+, audited, pinned) ✓ / snapshot versioning ✓ / auth ✓ / migration ✓ / tests ✓ / rollback ✓ / UX ✓ / deps (F-02) ✓.
- **P4:** closed vocabulary ✓ / single-path evaluator ✓ / readiness mapping + critical fail-closed ✓ / legacy tolerance ✓ / seed-only migration ✓ / tests ✓ / rollback ✓ / UX ✓ / deps (F-01) ✓.
- **P5:** math (quote-total-percentage semantic) + rounding ✓ / coherence ✓ / snapshot+prefill (latest-approved) ✓ / immutability + CO-derived v2 ✓ / no-money by absence+tests ✓ / migration ✓ / tests ✓ / rollback ✓ / labeling ✓ / deps (F-02; CO for v2) ✓.

## B36. Locked Technical Decisions

1. **Approval chain identity.** Decision: explicit immutable `approvalChainId` shared by all versions in one logical sequence; new chain per new subject/purpose, new version per resubmission or artifact revision. Reason: the vague "chain" concept cannot be enforced or tested. Invariant: exactly one non-terminal version per chain (partial unique index). Implementation consequence: version-targeted transitions, chain-scoped history queries, supersession updates prior row state without touching its timestamps.
2. **Approval subject targeting.** Decision: concrete nullable FKs + per-kind exactly-one CHECKs (Option C). Reason: real PG enforcement, tenant scoping, CASCADE-safe deletion, narrowable types; app-only checks and universal parents rejected on integrity grounds. Invariant: no approval row references an arbitrary unrelated ID. Implementation consequence: per-kind target table above; IDOR suite per kind.
3. **Approval artifact relationship.** Decision: one-directional — artifacts exist independently with own lifecycle; approvals point at exact artifact/version. Reason: eliminates the FK cycle and deferred-constraint complexity; artifacts outlive any single approval decision. Invariant: no approval FK on artifact rows; RESTRICT deletes of referenced artifacts. Implementation consequence: upload-then-attach flow; independent retention policy.
4. **Change Order approval uses P1.** Decision: CO customer approval is a P1 Approval instance, not a second implementation. Reason: one token pattern, lifecycle, audit, notification, and security surface. Invariant: no embedded CO approval state machine. Implementation consequence: slot coordination between CO pending state and linked approval version.
5. **Final-count representation.** Decision: versioned commercial-state snapshot on the approval row (+ quote FK), not a scalar-heavy table. Reason: counts are commercial state that versions naturally; tables-per-scalar multiply surface. Invariant: recounts create new versions; history preserved. Implementation consequence: derived count views read snapshots.
6. **Commercial schedule recomputation.** Decision: draft-edit-triggered recompute with `stale` gate blocking re-send until confirmed. Reason: silent alteration of reviewed commercial meaning is unacceptable. Invariant: no silent schedule mutation, ever. Implementation consequence: staleness flag + confirmation step in send flow.
7. **Accepted schedule immutability.** Decision: accepted schedules immutable; material changes via approved COs producing schedule v2; prefill resolves latest approved version. Reason: accepted commercial truth must survive subsequent negotiation. Invariant: no UPDATE path on accepted schedule rows. Implementation consequence: v1/v2 derivation logic + version-pinned prefill.
8. **Recipe versioning.** Decision: recipes immutable once referenced; edits create new versions with explicit activation. Reason: pinning stays truthful. Invariant: referenced recipe rows never mutated. Implementation consequence: version-list UX + activation flow.
9. **Legacy record semantics.** Decision: legacy parents never reinterpreted; new pack-aware children pin current context; legacy draft sends evaluate current validation as explicit new actions. Reason: additive migration must be behavior-preserving for history and predictable for new actions. Invariant: the legacy rule (§B9). Implementation consequence: version-tolerant reads, action-time pins.
10. **Pack switching semantics.** Decision: append-only assignment history, future-only effect, pinned-context validation with originating-version banner, fail-closed mismatch. Reason: silent semantic drift is the failure mode being designed out. Invariant: no existing record changes meaning on switch. Implementation consequence: assignment history table + banner UX + version logging.
11. **P4 critical binding failure behavior.** Decision: optional-field unknowns skipped with warning; critical-field invalid references fail closed (rule blocked, recipe activation refused); unknown binding kinds fail closed. Reason: a deleted critical field must never fake readiness. Invariant: readiness is never computed over unresolvable critical inputs. Implementation consequence: validation at recipe activation + evaluation time.
12. **AI generation/version semantics.** Decision: generated outputs are historical records attributed to their generation version; regeneration is a new event on current versions. Reason: provenance must survive reconfiguration. Invariant: prior outputs never rewritten by regeneration. Implementation consequence: version stamps on AI outputs + fingerprint invalidation.

No unresolved domain or architecture decisions block implementation planning.

## B37. Recommended Implementation Order

F-01 → F-02 → P4-01 → P3-01 → P1-01 → P1-02 → P2-01 → P2-02 → P5-01 → P5-02 → AI-01 → UX-01 → OPS-01 → MIG-01 → MKT-01. Rationale: pinning/versioning first (everything stamps it); P4 before P3 (requiredness source); P3 before P1 (approval-readiness gates); P1 before P2 (mechanism + token family); P2 before P5-v2 (change path); entities before AI/UX/OPS (registries, fingerprints, events); migration verification alongside foundations; marketing last (lagging rule). Milestone-recipe enablement flips after P5-01.

**Authorization state:** Gates 0–1: evidence/strategy established. Gate 2: technical specification corrected (pass C1) and ready for approval. Gates 3–6: unapproved. No implementation, migration, rollout, or deployment is authorized.
