# Owner Assistant: wrong tool answers + silent empty turns

Status: **plan** — 1 of 4 workstreams partially applied, nothing committed, nothing verified.
Scope: `features/owner-assistant/` (reported surface) plus the shared `lib/ai/` infrastructure it
depends on. `features/ai-agent/` (customer Agent) shares every root cause below and is covered in
Phase 5.

## 1. Reported symptoms

> "the ai became less accurate like when using tools it's giving the wrong answer also sometimes the
> chat just refresh and no respond from the ai"

Evidence from the dev server:

```
{"type":"ai_invocation","taskType":"assistant_message","model":"gemini-2.5-flash","provider":"google",
 "inputTokens":3266,"outputTokens":37,"latencyMs":1830,"status":"success"}
{"type":"ai_invocation","taskType":"assistant_message","model":"gemini-2.5-flash","provider":"google",
 "inputTokens":3230,"outputTokens":0,"latencyMs":5116,"status":"success"}
(node:19248) MaxListenersExceededWarning: 11 drain listeners added to [Gzip].   [~20x]
```

Three facts to read out of those lines:

- Every turn ran on `gemini-2.5-flash`, the model the registry itself annotates *"very limited
  (5 RPM, 20 RPD). Last resort."*
- `outputTokens: 0` with `status: "success"` — the model returned no text and the orchestrator
  recorded it as a success anyway. That is the "no respond" symptom.
- The `[Gzip]` warning is Next's dev-server compression accumulating listeners across many
  concurrent/abandoned streaming responses. It is a *symptom* of hung streams, not a cause. No repo
  code uses zlib outside `scripts/generate-og-fallback.ts`.

## 2. Where the regression came from

All of it is in the **uncommitted working tree**, not in `HEAD` (`5badba84`, which added the
owner-assistant surface). `git diff HEAD` shows the introduction of `lib/ai/token-budget.ts`, the
TPM-aware capacity selector, and the orchestrator changes that together produce both symptoms.

## 3. Root causes

### RC1 — every turn is routed to the reserve model

`lib/ai/capacity-selector.ts`

Only `GROQ_API_KEY`, `CEREBRAS_API_KEY`, and `GEMINI_API_KEY` are present in `.env.local`
(key presence only was checked; no values read). With `minQuality: 6` and `needsTools: true` the
eligible set is:

| model | quality | tpm budget (80% of provider TPM) |
|---|---|---|
| `groq:openai/gpt-oss-120b` | 9 | 6,400 |
| `cerebras:gpt-oss-120b` | 8 | 160,000 |
| `google:gemini-2.5-flash` | 9 | 25,600 (5 RPM / 20 RPD) |

Two uncommitted changes conspire:

1. The new scoring line took `Math.max(loadRatio, estimatedTokens / cap.tpm)`. A typical assistant
   turn estimates `3200 × 1.25 + 250 + 900 ≈ 5,150` tokens, so Groq scores `5150 / 6400 = 0.80`,
   which is **not** `< CAPACITY_THRESHOLD (0.80)`. Groq is therefore classified *stressed* on the
   first request of every minute, on an empty counter.
2. The diff **deleted `cerebras:zai-glm-4.7`**, the only quality-9 Cerebras entry, leaving Cerebras
   at quality 8.

`available` is then sorted by quality descending — so `google:gemini-2.5-flash` (quality 9) wins
every turn. That is the accuracy regression: a 20-requests-per-day emergency model became the
default, and past ~20 messages/day it becomes hard 429s.

Related, and pre-existing: **`recordModelUsage()` is never called by either chat orchestrator**
(only `lib/ai/router.ts` calls it — `grep -rn "recordModelUsage" app features lib`). RPM/RPD
counters stay at 0 for all chat traffic, so Gemini's 20 RPD ceiling is invisible to the selector and
`dayLoad` can never push it out of the `available` tier.

### RC2 — turns come back with no text

Two independent mechanisms, either sufficient on its own:

- `features/owner-assistant/orchestrator.ts:212` — `stopWhen: stepCountIs(5)` became
  `stepCountIs(3)`. Three chained tool calls consume all three steps, so the final text step never
  runs and the turn ends with zero text.
- `features/owner-assistant/orchestrator.ts:214` — `maxOutputTokens` dropped from `2000` to
  `CHAT_TOKEN_BUDGETS.assistant.output` (`900`), while `gemini-2.5-flash` runs with **thinking on by
  default and no cap**: `lib/ai/registry.ts` sets no middleware and no `providerOptions`, and
  `lib/ai/strip-reasoning-middleware.ts` is dead code (zero importers). Reasoning tokens eat the
  per-step budget and no candidate text is emitted.

### RC3 — one empty turn poisons the rest of the session

`onFinish` (orchestrator.ts:271) persists whatever `text` it got, and `addMessage`
(`session-service.ts:312`) has no empty-content guard. So a `{role: "assistant", content: ""}` row
lands in `owner_assistant_messages`. Next turn it is replayed into `messages`, and
`@ai-sdk/google@3.0.75` **drops empty text parts** (`part.text.length === 0 ? void 0 : {...}`),
producing a message with no parts that the Google API rejects. `features/owner-assistant/components/
message-mapping.ts:44` also emits an empty text part for such a row, and `AssistantTurn` renders
`{block.text ? <ChatMarkdown/> : null}` — so the turn renders as literally nothing in the UI.

`onFinish` additionally logs `status: "success"` (orchestrator.ts:310) for a zero-text turn, which
is why the logs look healthy.

### RC4 — no fallback at all

`orchestrator.ts:181` takes `selectedModels[0]` and never tries `[1..n]`. A single 429 from the
reserve model is terminal for the request. Combined with RC1 this is the "chat just refresh"
symptom once the daily Gemini allowance is gone.

AI SDK 6 has no cross-model fallback primitive, and `await result.warnings` is **not** usable as a
readiness probe: `get warnings()` → `finalStep` → `steps` → `consumeStream()`
(`node_modules/ai/dist/index.mjs:8516`), i.e. it waits for the whole generation and would defeat
streaming. The correct seam is a `LanguageModelV3` wrapper that loops inside `doStream`.

### RC5 — accuracy defects independent of the regression

1. **No current date anywhere in the prompt.** `features/owner-assistant/prompts/system-prompt.ts`
   says *"Default to recent data (current month)"* and the tools take ISO `dateRange`
   (`schemas.ts:12`), but no prompt injects today's date. The model guesses date ranges. Grep
   confirms zero date injection across all prompt directories. `business.timezone` (IANA, default
   `"UTC"`) is available on the action context (`lib/db/business-access.ts:191, 281`) and is not
   threaded into the orchestrator.
2. **Tool results are dropped from replayed history.** `orchestrator.ts:148` filters history to
   `user`/`assistant` only, so `role: "tool"` rows never return to the model. Follow-up questions
   are answered from the assistant's own prose paraphrase instead of the retrieved data.
3. **`temperature: 0.7`** on numeric retrieval and status lookups (orchestrator.ts:213).
4. **`searchInquiriesSchema` is missing `"overdue"`** (`schemas.ts:22-24`) while the DB
   `inquiryStatusEnum` has it. Asking for overdue inquiries fails validation or silently drops the
   filter.
5. **Same-millisecond ordering.** `session-service.ts` writes `createdAt: new Date()` and reads
   `orderBy: [desc(createdAt)]` — tool rows written inside one step can replay out of order.

## 4. Fix plan

### Phase 1 — routing (RC1)  · `lib/ai/capacity-selector.ts`

**Already applied** (uncommitted, unverified):

- Added `reserve?: boolean` to `ModelCapacity` with the rationale in a doc comment.
- Set `reserve: true` on `google:gemini-2.5-flash`.
- `getLoadRatio(cap, estimatedTokens)` now folds the request estimate into the accumulated token
  count — `(tokenCount + estimatedTokens) / cap.tpm` — instead of comparing the estimate to the
  budget on its own, and counts the current request in `minuteLoad`/`dayLoad`.
- `selectModels` sorts non-reserve ahead of reserve in **both** the `available` and `stressed`
  tiers, via a `reserveRank()` helper, before the existing quality-desc / load-asc tiebreakers.

Net effect for the current key set: order becomes `cerebras:gpt-oss-120b` → `groq:openai/gpt-oss-120b`
→ `google:gemini-2.5-flash`. Groq still scores stressed for a 6K-token tool-calling turn, which is
correct — its 8K org TPM genuinely cannot carry one — but it is now a *fallback* rather than the
reason Gemini gets promoted.

**Still to do:**

- Call `recordModelUsage(modelId)` when a stream actually starts, so RPM/RPD are tracked for chat
  traffic. Best placed inside the Phase 3 fallback wrapper so both surfaces get it once.
- Decide on `cerebras:zai-glm-4.7`. It was deleted in the working tree and I have not verified the
  model still exists on Cerebras. Recommendation: **leave it deleted** — restoring an unverified
  model id would burn a fallback attempt on a 404. Revisit only if quality-9 Cerebras is wanted back.
- Add `tests/unit/ai-capacity-selector.test.ts` (none exists today): reserve model never outranks a
  non-reserve model, a large `estimatedTokens` marks a small-TPM model stressed without evicting it
  from the list, unconfigured providers are filtered out.

### Phase 2 — stop the empty turns (RC2, RC3)

`features/owner-assistant/orchestrator.ts`

1. `stopWhen: stepCountIs(3)` → `stepCountIs(5)`, restoring room for up to four tool steps plus a
   final text step. Keep the comment honest about why 5.
2. Add `providerOptions` so a thinking model cannot spend the whole output budget on reasoning:
   ```ts
   providerOptions: {
     google: { thinkingConfig: { thinkingBudget: 0, includeThoughts: false } },
   },
   ```
   Verified valid for `gemini-2.5-flash` in `@ai-sdk/google@3.0.75`
   (`dist/index.d.ts:17-19`). Keys for other providers are ignored, so this is safe on the shared
   call. Alternative considered and rejected: wiring the dead `stripReasoningMiddleware` into the
   registry — it strips reasoning from the *output* but the tokens are still spent.
3. Raise `CHAT_TOKEN_BUDGETS.assistant.output` from `900` to `2000` in `lib/ai/token-budget.ts`,
   restoring the pre-regression cap while keeping the shared constant.
   `tests/unit/ai-token-budget.test.ts` does not assert either number, so this is safe.
4. Guard the empty result in `onFinish`:
   - only `addMessage` when `filtered.output.trim()` is non-empty;
   - when it is empty, log the invocation with a non-`success` status so it stops looking healthy in
     the logs, and include `finishReason` in the log payload. `logAiInvocation` currently types
     `status: "success" | "error"` (`lib/ai/token-logger.ts:72`) — widen it or map empty→`"error"`
     with an explicit `errorMessage: "empty_completion"`.
5. Belt-and-braces against rows already in the database: filter `content.trim()`-empty rows out of
   the replayed history in the orchestrator, and skip them in
   `features/owner-assistant/components/message-mapping.ts` so the UI does not render a blank turn.
6. Add an empty-content guard to `addMessage` in `session-service.ts` for `user`/`assistant` roles,
   so no future code path can write one. (Tool rows may legitimately be `"{}"`.)

Open question for the user, non-blocking: when the model genuinely produces nothing, should the UI
show a short "I didn't get a response — try again" turn instead of silence? Current plan is silence
plus a corrected log line; a visible retry affordance is a small extra change in
`owner-assistant-chat.tsx` if wanted.

### Phase 3 — model fallback (RC4) · new `lib/ai/fallback-model.ts`

Add a `LanguageModelV3` wrapper that walks the ordered list from `selectModels`:

```ts
export function createFallbackLanguageModel(opts: {
  modelIds: `${string}:${string}`[];
  maxAttempts?: number;              // default 3, bounds latency
  onModelSelected?: (a: { modelId: string; provider: string; model: string }) => void;
  onAttemptFailed?: (a: {...}, error: unknown) => void;
}): LanguageModelV3
```

- `doStream(options)` loops the candidates: `await model.doStream(options)`. Provider clients throw
  `APICallError` from the failed-response handler before any chunk on 429/401/400, so an immediate
  failure is catchable.
- Also peek the head of the returned stream: buffer parts until the first part that is not
  `stream-start`; if that part is `{type: "error"}`, nothing has reached the client yet, so treat it
  as an immediate failure and fall back. Otherwise re-emit the buffered parts and pipe the rest —
  streaming is preserved, cost is one part of buffering.
- On failure: `markModelExhausted(modelId)` for retryable errors, log via
  `getSanitizedErrorInfo(error)`, try the next candidate. Non-retryable errors also advance to the
  next *provider* (a 400 that one provider rejects — e.g. Google's empty-part rejection — often
  succeeds elsewhere), bounded by `maxAttempts`.
- On success: `recordModelUsage(modelId)` and `recordModelTokenUsage(modelId, estimate)` for the
  model that actually served, then `onModelSelected`.
- `doGenerate` gets the same loop without the peek.

Reuses `isRetryableError` / `getSanitizedErrorInfo` from `lib/ai/errors.ts` and
`markModelExhausted` / `recordModelUsage` from the capacity selector. Export from `lib/ai/index.ts`
next to the other selector exports.

Note: `streamText` calls `doStream` **once per step**, so each step independently falls back — good
for resilience, and it means the model that serves the final step is the one to attribute. The
orchestrator keeps a mutable holder updated by `onModelSelected` and reads it in `onFinish` for
`addMessage(provider, model)` and `logAiInvocation`. This replaces the current pre-stream
`recordModelTokenUsage` call at orchestrator.ts:196, which attributes the estimate to a model that
may never be used.

Why not `lib/ai/router.ts`'s existing `streamWithFallback`: it hardcodes `needsTools: false`,
flattens the result into a plain text-chunk generator, and cannot return a `StreamTextResult`, so
`toUIMessageStreamResponse()` and tool parts are impossible through it. Its single consumer is
`app/api/business/follow-ups/suggest-message/route.ts`; leave it alone.

### Phase 4 — tool accuracy (RC5)

1. **Inject the current date.** Thread `timezone` from `getBusinessActionContext` →
   `app/api/ai/owner-assistant/chat/route.ts` → `runOwnerAssistant` → `generateSystemPrompt`, and add
   a `## Today` block giving the ISO date, the day of week, and the current month's start/end in ISO
   so the model can fill `dateRange` without inventing it. Use `Intl.DateTimeFormat` with the
   business timezone; fall back to UTC.
2. **Replay tool results.** Include `role: "tool"` rows in the history the orchestrator builds, as
   compact text context (`[data from <toolName>] <json>`) run through the existing
   `truncateToolOutput` from `lib/ai/tool-truncator.ts` (currently exported but unused outside its
   own test). *Deliberately not* reconstructed as real `tool` role messages: our rows record results
   without the matching tool-call ids in the same assistant message, and a mismatched pair is a
   provider 400.
3. **`temperature: 0.7` → `0.2`** for the assistant. Retrieval and arithmetic, not prose.
4. **Add `"overdue"`** to the `searchInquiriesSchema` status enum. Safe: `queries.ts` uses
   `eq(inquiries.status, params.status)` and the DB enum already contains it.
5. **Stable replay order.** Add a monotonic tiebreaker to the history read — order by
   `(createdAt, id)` — so same-millisecond tool rows cannot swap.

### Phase 5 — customer Agent parity

`features/ai-agent/orchestrator.ts` has the identical defects: `selectedModels[0]` with no fallback
(line 289), `stepCountIs(3)` (line 330), `temperature: 0.7` (line 331), no `providerOptions`, and the
same pre-stream `recordModelTokenUsage` (line 315). Phase 1's selector fix already covers it. Apply
the Phase 2 and Phase 3 changes there too — this is a customer-facing surface, and leaving it to
answer with silence would be worse than the reported bug. Prompt/date work (Phase 4) is
assistant-specific and stays out of scope here.

## 5. Verification

- `npm run check` (lint + typecheck + SEO audits) — required for every phase.
- `npm run test` — after Phase 1 (new capacity-selector unit test) and Phase 4 (schemas).
- `npm run test:integration` — `assistant-chat-route.test.ts`,
  `owner-assistant-session-lifecycle.test.ts`, `owner-assistant-tenant-isolation.test.ts`,
  `ai-agent-*`.
  **Blocker to fix first:** `tests/integration/assistant-chat-route.test.ts:30` mocks
  `@/lib/ai/capacity-selector` with only `selectModels`. The orchestrator already imports
  `recordModelTokenUsage` from that module, so the mock is missing it and the first test
  (`expect(response.status).toBe(200)`, line 130) is very likely red **before** any of this work.
  The mock needs `recordModelTokenUsage`, `recordModelUsage`, and `markModelExhausted`. I have not
  run it — integration tests need Postgres — so treat "currently red" as expected, not confirmed.
- `npm run build` — after Phase 3/4 touch the route handler signature.
- Manual: send three assistant turns that each trigger a tool, confirm the `ai_invocation` lines show
  a non-Gemini provider, `outputTokens > 0`, and that "how many inquiries this month" returns the
  same number the dashboard shows.

## 6. Decisions taken, and what I would flag

- **Fallback lives at `doStream`, not around `streamText`.** `await result.warnings` buffers the
  entire generation; the wrapper is the only seam that keeps streaming.
- **`thinkingBudget: 0` rather than a smaller non-zero budget.** `gemini-2.5-flash` supports full
  disable, and the assistant's job is retrieval over the business's own data, not open-ended
  reasoning. Easy to raise later if answer quality on multi-step questions suffers.
- **Empty turns are logged as failures.** Recording `status: "success"` for a zero-token completion
  is what let this ship unnoticed; the log change matters as much as the fix.
- **`cerebras:zai-glm-4.7` stays deleted** pending confirmation that the model id is still valid.
- The `[Gzip]` `MaxListenersExceededWarning` should disappear once turns stop hanging. If it
  persists after Phase 2/3, it is a separate dev-server issue and not worth chasing before then.
