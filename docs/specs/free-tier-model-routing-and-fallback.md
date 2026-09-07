# Free-Tier Model Routing And Fallback

## Problem Statement

Every model provider behind Requo's AI runs on a free tier, and the app is configured against
allowances that do not exist.

A business owner opens the Assistant, asks what came in this week, and gets one of three
outcomes without being able to predict which: a streamed answer, a reply that never arrives
and leaves the transcript sitting silent, or the words "An error occurred." — the same words
whatever actually went wrong. Asking the same question again can produce a different one of
the three. The longer the conversation runs the worse it gets: a turn that needs three Tool
calls fails more often than a turn that needs none, and a conversation that worked this
morning stops working this afternoon with nothing changed on the owner's side. When the
Assistant does surface detail, it is the provider's own JSON error body printed into the
transcript.

A prospective customer on the public Agent hits the same wall, and it costs more there. They
are part-way through describing the job they want quoted, the Agent stops answering, and
nothing on screen points them at the Inquiry form instead. The business never learns the lead
existed.

The owner also loses the AI they were sold outside chat. Asking for an AI-drafted Quote on a
Business plan fails outright rather than degrading, because the drafting path gives up on the
first provider that refuses instead of trying the next one. Follow-up message suggestions and
analytics summaries fail the same way, quietly, in the background.

None of this is random — it is arithmetic:

- The provider sitting second in nearly every fallback chain is configured at forty times its
  real request allowance: 200 requests per minute against a real five. It is therefore
  selected constantly and refuses constantly.
- Four of the eleven model identifiers in the routing catalog no longer exist at their
  providers. Two were never real free-tier identifiers; two more were retired. A request to
  any of them is a 404, every time, for everyone.
- The fallback wrapper tries three candidates per turn. Dead identifiers spend those attempts
  without ever reaching a model, so a turn can exhaust its whole budget on 404s and report
  that every model failed while healthy providers sit idle.
- Outside chat it is worse: that path abandons the entire chain on the first failure it judges
  non-retryable, and a 404 from a dead identifier is exactly that. One stale catalog entry
  therefore ends Quote drafting rather than costing it a candidate.
- Nothing models a daily allowance, only a per-minute one. A provider that has spent its day's
  budget is re-offered every sixty seconds until midnight, failing every time.
- Nothing models Cloudflare's neuron budget at all, so that provider's daily ceiling is
  discovered by hitting it.
- Routing is blind to what the work actually is. The only lever is a minimum quality score,
  and because every catalog entry scores seven or above, the "cheap" and "balanced" settings
  select an identical pool. A 4,000-token Quote draft and a two-sentence follow-up suggestion
  are routed the same way, and the draft is handed to the provider with the smallest
  per-minute token allowance in the set.
- The token estimate that drives selection allows a flat 250 tokens for the system prompt and
  every Tool schema combined. The Assistant sends twelve Tool schemas and a system prompt
  several times that size, on every one of up to five steps. Selection is therefore made on a
  number that understates the turn by thousands of tokens, and picks providers that cannot fit
  it.
- The context limiter stops trimming as soon as a conversation is short enough by message
  count, regardless of how many tokens those messages hold, so a handful of large Tool results
  sails past the budget it is supposed to enforce.

Underneath all of it, nothing notices when a provider retires a model. The catalog drifted
from reality silently, and will drift again.

## Solution

Route by what the work is, size every chain to what each provider actually permits, and stop
letting a bad candidate become something the user sees.

The owner gets an Assistant that answers. Chat is routed first to the provider with the most
generous tool-capable free allowance rather than the fastest one, so the surface with twelve
Tool schemas and the longest history is served by the model that can hold it. When a provider
refuses, the next one is tried — including after the kind of refusal the app currently treats
as fatal — and the turn continues. A model identifier that no longer exists is skipped and
remembered as dead for hours, and skipping it does not cost the turn one of its attempts. If
every candidate really is unavailable, the owner is told that in plain language, with the
provider's raw error body kept in the logs where it belongs.

The prospective customer gets an Agent that stays available on the fastest provider that
genuinely fits its shorter turns, and that fails usefully when it cannot: a message that says
the chat is unavailable and points them at the Inquiry form, so the lead still reaches the
business.

Quote drafting stops being all-or-nothing. It is routed to providers whose per-minute token
allowance can hold a 4,000-token draft alongside a knowledge-grounded prompt, it never gets
offered the provider that cannot, it advances through its chain instead of stopping at the
first refusal, and the highest-context provider in the set is kept as the escape hatch for the
largest grounded prompts. Short background work — follow-up suggestions, analytics summaries,
digests — is deliberately routed to small, cheap models so it stops competing with chat for
the same scarce allowance.

Accuracy is protected by ordering, not by trimming. An oversized turn is sent to a provider
with more room rather than compacted until it fits, and the strongest models are held in
reserve for the highest-value work instead of being spent on every conversation.

Metering matches how providers actually bill. Daily allowances, per-organisation allowances
shared across a provider's models, and Cloudflare's neuron pool are all counted, each expiring
when that provider's day actually resets. A refusal that names a daily quota takes the model
out until that reset rather than for sixty seconds. Counters are corrected against real usage
after each turn instead of accumulating an estimate's error.

And the catalog stops drifting: a check that lists each provider's live models and fails on any
identifier Requo names but the provider no longer serves runs as part of the standard check
command, so the next retirement is caught by CI rather than by an owner mid-conversation.

## User Stories

### Talking to the Assistant

1. As a business owner, I want the Assistant to answer on the first attempt, so that I do not
   have to guess whether asking again will work better.
2. As a business owner, I want a turn that needs several Tool calls to succeed as reliably as a
   turn that needs none, so that I can ask real questions about my Inquiries and Quotes instead
   of only simple ones.
3. As a business owner, I want an Assistant conversation to still work on its tenth turn, so
   that I can stay in one thread rather than starting a new Session to get an answer.
4. As a business owner, I want the Assistant served by a provider that can hold my whole
   conversation plus its Tools, so that a reply is never refused for size.
5. As a business owner, I want the Assistant to never reply with a blank message, so that
   silence is not something I have to interpret.
6. As a business owner, I want the Assistant to answer from my full recent history rather than
   a version trimmed to fit a small provider, so that it does not forget what I said two turns
   ago.
7. As a business owner, I want the Assistant to keep going when a provider refuses mid-answer,
   so that a half-written reply is finished rather than abandoned.
8. As a business owner, I want an Assistant conversation I hold in the afternoon to behave like
   one I held in the morning, so that the surface feels dependable rather than moody.
9. As a business owner, I want my Assistant conversation to be unaffected by whatever
   background AI work Requo is doing at the same time, so that a nightly digest never costs me
   an answer.

### Talking to the Agent as a prospective customer

10. As a prospective customer, I want the Agent to keep answering while I describe the job I
    want quoted, so that I can finish explaining what I need.
11. As a prospective customer, I want the Agent to reply quickly, so that the conversation
    feels like a chat rather than a form.
12. As a prospective customer, I want a clear message when the chat is genuinely unavailable,
    so that I know it is broken rather than thinking I said something wrong.
13. As a prospective customer, I want to be pointed at the Inquiry form when the chat cannot
    continue, so that I can still reach the business.
14. As a prospective customer, I want a Proposed Inquiry I have already reviewed to survive a
    provider failure later in the conversation, so that I do not lose the details I gave.
15. As a business owner, I want a visitor whose Agent chat fails to still be able to submit an
    Inquiry, so that a provider outage does not silently cost me leads.
16. As a business owner, I want the Agent never to show a visitor a provider's error text or
    internal model name, so that a failure does not look unprofessional.

### Getting an AI-drafted Quote

17. As a business owner on a paid plan, I want an AI-drafted Quote to be produced rather than
    failing, so that the feature I pay for works when I use it.
18. As a business owner, I want Quote drafting to try the next provider when one refuses, so
    that a single provider's limits do not decide whether I get a draft.
19. As a business owner, I want Quote drafting routed only to providers that can actually hold
    a full draft, so that it is not handed to one that cannot fit the request.
20. As a business owner, I want a Quote drafted against a large Business Memory context to
    still succeed, so that grounding my draft in my own documents does not make it fail.
21. As a business owner, I want the strongest available model kept in reserve for Quote
    drafting, so that my highest-value AI work gets the best model rather than whatever is
    idle.
22. As a business owner, I want Quote improvement to behave like Quote drafting, so that
    refining a draft is no more fragile than creating one.
23. As a business owner, I want a Quote draft that cannot be produced to tell me so, so that I
    do not sit waiting on a request that already gave up.

### Background AI that should not compete with chat

24. As a business owner, I want AI-suggested Follow-up messages to be produced when I ask for
    one, so that the suggestion button is not a coin flip.
25. As a business owner, I want my analytics summary and scheduled digest to arrive with their
    AI narrative intact, so that a background failure does not quietly downgrade a report I
    rely on.
26. As a business owner, I want short background AI work routed to small models, so that it does
    not spend the allowance my Assistant needs.
27. As a business owner, I want imported files to keep being read by a multimodal model, so that
    the importer is not degraded by this change.
28. As a business owner, I want Inquiry Qualification and other background AI steps to keep
    working while chat is under load, so that the workflow keeps moving even when a provider is
    saturated.

### Routing that reflects the work

29. As a Requo maintainer, I want each AI surface to declare which kind of work it is doing, so
    that routing is a property of the surface rather than a number guessed at the call site.
30. As a Requo maintainer, I want the provider order for each kind of work to be written down as
    data, so that changing a chain is an edit to a table rather than to control flow.
31. As a Requo maintainer, I want a provider that cannot serve a kind of work excluded from that
    chain entirely, so that it is never offered a request it must refuse.
32. As a Requo maintainer, I want the chat surfaces ordered by which provider has the most
    generous tool-capable allowance, so that the surface with the heaviest requests gets the
    provider that can serve them.
33. As a Requo maintainer, I want the public Agent ordered by speed within what fits, so that an
    anonymous visitor gets the fastest provider that can genuinely serve a short turn.
34. As a Requo maintainer, I want the highest-context provider kept as a deliberate escape hatch
    rather than a workhorse, so that its very low daily allowance is spent only where nothing
    else fits.
35. As a Requo maintainer, I want reserve-tier models ranked last within a chain, so that they
    stay available for the work that needs them.
36. As a Requo maintainer, I want the quality tiers that select identical pools removed, so that
    a routing setting that does nothing cannot be mistaken for one that does.
37. As a Requo maintainer, I want one catalog of models rather than three disagreeing lists, so
    that a limit, a price, and a capability cannot drift apart from each other.
38. As a Requo maintainer, I want the catalog keyed by the same provider prefix the runtime
    registry uses, so that a Gemini-served turn is priced instead of being logged as unpriced.
39. As a Requo maintainer, I want the importer's hardcoded model identifiers moved into the
    catalog, so that they are covered by the same drift check as everything else.

### Metering that matches how providers bill

40. As a Requo maintainer, I want each provider's real free-tier request, daily and token
    allowances recorded, so that load spreading is based on what the provider permits rather
    than on an aspirational number.
41. As a Requo maintainer, I want per-organisation allowances counted across all of a provider's
    models, so that two models sharing one bucket are not each given the whole bucket.
42. As a Requo maintainer, I want a daily token allowance modelled as its own dimension, so that
    a provider that is out of tokens for the day is not re-offered every minute.
43. As a Requo maintainer, I want each daily counter to expire when that provider's day actually
    resets, so that a UTC-midnight provider and a Pacific-midnight provider are not treated
    identically.
44. As a Requo maintainer, I want Cloudflare's neuron budget counted as a daily pool, so that
    its ceiling is respected rather than discovered by hitting it.

45. As a Requo maintainer, I want token counters corrected against the real usage a turn reported,
    so that a minute's accounting converges on truth instead of accumulating an estimate's
    error.
46. As a Requo maintainer, I want the estimate that drives selection to include the real system
    prompt and Tool schema overhead, so that the selector is not choosing providers on a number
    thousands of tokens too small.
47. As a Requo maintainer, I want a refusal that names a daily quota to take that model out until
    the day resets, so that it is not retried every sixty seconds for the rest of the day.
48. As a Requo maintainer, I want a refusal that names a per-minute limit to cool down for a
    minute only, so that a transient burst does not cost the model an entire day.
49. As a Requo maintainer, I want the dev capacity view to show the new dimensions, so that I can
    see daily, neuron and provider-shared load rather than inferring them.

### Failures the user never sees

50. As a business owner, I want the words shown when AI is unavailable to describe what happened
    in plain language, so that I can tell "try again in a minute" apart from "this is broken".
51. As a business owner, I want a provider's raw JSON error body kept out of my transcript, so
    that the Assistant does not read as a stack trace.
52. As a business owner, I want a turn that has already streamed some text to recover and finish
    rather than stopping mid-sentence, so that a partial answer is not the final answer.
53. As a Requo maintainer, I want a request that no provider can accept because it is too large
    to be sent to a larger-context provider rather than retried unchanged, so that the same
    payload does not fail identically down the whole chain.
54. As a Requo maintainer, I want a model identifier the provider no longer serves to be skipped
    without consuming one of the turn's attempts, so that stale catalog entries cost nothing at
    runtime.
55. As a Requo maintainer, I want a dead identifier remembered as dead for hours rather than
    seconds, so that every request does not rediscover it.
56. As a Requo maintainer, I want the attempt budget for chat set explicitly at the call site, so
    that how many providers a turn will try is visible rather than inherited from a default.
57. As a Requo maintainer, I want the trail of candidates a turn tried and why each failed
    recorded against the run, so that I can diagnose a bad conversation after the fact.
58. As a Requo maintainer, I want the model that actually served a turn recorded on the message
    and in the invocation log, so that attribution reflects reality rather than the first
    candidate.
59. As a Requo maintainer, I want a zero-text completion logged as an error rather than a
    success, so that silent failures do not look healthy in the logs.
60. As a Requo maintainer, I want agent-run cost estimates priced from the real catalog, so that
    every run is not recorded at the same default rate.

### Keeping the catalog honest

61. As a Requo maintainer, I want a check that lists each configured provider's live models and
    fails on any identifier Requo names but the provider no longer serves, so that a retirement
    is caught by CI rather than by an owner mid-conversation.
62. As a Requo maintainer, I want that check to run as part of the standard check command, so
    that nobody has to remember it.
63. As a Requo maintainer, I want an opt-in probe that makes one minimal tool-calling request per
    candidate, so that tool capability is confirmed rather than assumed.
64. As a Requo maintainer, I want the probe kept out of the automatic check, so that CI does not
    spend the same free-tier quota the product needs.
65. As a Requo maintainer, I want the check to fail loudly rather than skip when a provider's
    credentials are absent from the environment it runs in, so that a green check means the
    catalog was really compared.

### Tuning without a deploy

66. As an operator, I want every allowance in the catalog overridable by environment variable, so
    that a provider changing its free tier is a config change rather than a release.
67. As an operator, I want the override names to follow the convention already used for
    per-minute token limits, so that there is one pattern to learn.
68. As an operator, I want the documented free-tier limits and the headroom comment to match the
    code, so that the reference I read is not contradicted by the behaviour I get.
69. As an operator, I want to see which model served a real conversation and watch the counters
    move by roughly the actual token count, so that I can verify the routing change took effect.

## Implementation Decisions

### One catalog replaces three

Three lists currently describe models and disagree with each other: a provider/model options
list used for documentation and selection UI, the capacity table that actually routes chat, and
a token cost table. They carry different identifiers, different limits, and different provider
prefixes — the cost table keys Gemini entries under `gemini:` while the runtime registry uses
`google:`, so every Gemini-served turn is logged as unpriced.

These collapse into one catalog module, keyed by the provider prefix the runtime registry
actually uses (`groq`, `cerebras`, `google`, `mistral`, `cloudflare`, `nvidia`, `openrouter`).
The cost table is derived from it rather than maintained beside it. Provider display names and
the provider-name type stay where they are, since environment parsing and token budgeting
already depend on them.

The entry shape is the decision, because it names exactly which dimensions the system meters:

```ts
export type ModelEntry = {
  modelId: `${string}:${string}`;
  quality: number;               // 1-10
  contextWindow: number;
  maxOutputTokens: number;
  toolCapable: boolean;
  structuredOutput: boolean;
  limits: {
    rpm: number; rpd: number;    // 0 = not published / not modelled
    tpm: number; tpd: number;
    /** Cloudflare only: neurons per 1M tokens, billed against a daily pool. */
    neuronsPerMillion?: { input: number; output: number };
  };
  /** Which limits are per-organisation rather than per-model. */
  sharedWithProvider: Array<"rpm" | "rpd" | "tpm" | "tpd">;
  /** When the day counter resets, so exhaustion cooldowns are accurate. */
  dayResets: "rolling" | "utc-midnight" | "pacific-midnight";
  costCentsPerMillion: { input: number; output: number };
};
```

### Corrected free-tier data

Limits were researched from provider documentation and, where a provider publishes a models
endpoint, the live identifier list was probed directly. Dead identifiers are removed rather than
left in place with a comment.

| Provider | Real free-tier ceiling | Catalog entries |
|---|---|---|
| Groq | 30 RPM · 1K RPD · 8K TPM · 200K TPD, per-organisation | `openai/gpt-oss-120b` (q9), `openai/gpt-oss-20b` (q7). All Llama identifiers dropped — now Enterprise-only. |
| Cerebras | 5 RPM · 30K uncached TPM · 1M TPD | `gpt-oss-120b` (q8), `qwen-3.8-27b` (q7). Two non-public identifiers dropped. |
| Gemini | Unpublished; conservative estimates, per-project, resets midnight Pacific | `gemini-2.5-flash-lite` 15 RPM / 1K RPD / 250K TPM (q8), `gemini-2.5-flash` 10 RPM / 250 RPD (q9), `gemini-2.5-pro` 5 RPM / 100 RPD (q10, reserve) |
| Mistral | Unpublished free mode (requests per second, TPM, monthly tokens) | `mistral-medium-latest` (q9), `mistral-small-latest` (q8), both at a deliberately conservative 30 RPM |
| Cloudflare | 10,000 neurons/day, resets 00:00 UTC · ~300 RPM | four entries at their published neuron rates, quality 5-8 |
| NVIDIA NIM | 40 RPM hard cap, credit-based | three probed-live identifiers replacing three dead ones, configured at 20 RPM |
| OpenRouter | 20 RPM · 50 RPD (no credits purchased) | four probed-live tool-capable `:free` identifiers, 256K-1M context, quality 7-8 |

Every allowance stays overridable from the environment, extending the existing per-provider TPM
override convention with per-minute request, per-day request and per-day token equivalents, plus
a dedicated override for OpenRouter's daily request cap and for Cloudflare's daily neuron pool.
Gemini's numbers in particular are estimates — Google no longer publishes per-model free-tier
limits — so the table is a starting point ops can tune without a deploy. The environment
reference's headroom comment is corrected at the same time: it currently describes the reserved
fraction as the usable one.

### Routing by use case, not by quality score

The existing quality-tier lever is inert: three tiers map onto minimum quality scores of 4, 6 and
8, and because every catalog entry scores 7 or above, two of the three tiers select an identical
pool. It is replaced by named profiles, one per kind of work, derived from the existing AI task
types plus one added profile for short background text:

```ts
export type AiRoutingProfile =
  | "assistant_chat"   // owner Assistant: 12 Tool schemas, long history
  | "agent_chat"       // public customer Agent: 5 Tool schemas, short turns
  | "quote_draft"      // 4K output, large grounded prompt, accuracy-critical
  | "quote_improvement"
  | "short_text"       // Follow-up suggestions, analytics summaries, digests
  | "extraction";      // importer, multimodal
```

Each profile declares whether it needs Tools, a minimum quality, an explicit provider order, and
providers to exclude outright. Model selection keeps its capacity arithmetic but takes a profile
instead of loose criteria, so the ordering is data rather than a chain of conditionals.

| Profile | Order | Reasoning |
|---|---|---|
| `assistant_chat` | Gemini Flash-Lite → Cerebras → Mistral Medium → OpenRouter (GLM) → Groq → Gemini Flash (reserve) | Twelve Tool schemas plus a long system prompt is roughly 2.5-3K tokens of fixed overhead per step, across up to five steps. Only high-TPM providers survive that; Groq's 8K TPM puts it late in the chain, not first. |
| `agent_chat` | Groq → Gemini Flash-Lite → Cerebras → Mistral Small → OpenRouter (Nemotron) | Five Tools and a short system prompt do fit 8K TPM, and Groq is the fastest — the right trade for an anonymous public surface. |
| `quote_draft`, `quote_improvement` | Mistral Medium → Cerebras → Gemini Flash → OpenRouter (1M-context) → Gemini Pro (reserve) | A 4,000-token output plus a knowledge-grounded prompt cannot fit Groq's 8K TPM, so Groq is excluded entirely. The 1M-context OpenRouter entry is the escape hatch for the largest grounded prompts. |
| `short_text` | Groq 20B → Cloudflare 20B → Cerebras Qwen → NVIDIA Nano | 150-300 output tokens. Deliberately keeps the high-TPM providers free for chat. |
| `extraction` | Gemini Flash → Gemini Flash-Lite | Multimodal document reading; the importer's own identifiers move into the catalog so they are covered by the drift check. |

Accuracy is protected by ordering rather than truncation: an oversized turn goes to a
higher-capacity provider instead of being compacted until it fits, and reserve-tier models are
held back for the highest-value work.

### Capacity accounting

The existing selector already takes the worst of its per-minute, per-day and token load ratios
and folds the current request's estimate into the token dimension. That design is kept; four
gaps are closed, all on the existing cache layer, which already supports counters with per-key
expiry and an in-memory fallback.

Provider-scoped counters are added for the dimensions a provider meters per organisation rather
than per model. Today only the exhaustion path knows that Groq's token limit is shared; the load
ratio does not. Each dimension a catalog entry marks as shared is evaluated as the worse of its
model-scoped and provider-scoped ratio, so two models drawing on one bucket are not each handed
the whole bucket.

A daily token dimension is added, with each counter's expiry set from the entry's declared reset
behaviour rather than a fixed 24 hours, so a counter lapses when the provider's day actually
turns over. Cloudflare's neuron pool is metered as its own shared daily counter: estimated tokens
are converted to neurons at the entry's published rates and charged against one account-wide
budget.

Estimates are reconciled against actuals. Token usage is currently recorded only from the
preflight estimate, which is derived from character counts; each surface now posts the difference
between reported and estimated usage once a turn finishes, so a minute's counter converges on
truth instead of drifting.

Exhaustion cooldowns are scoped to the limit that tripped. Today any retryable failure pins the
model's per-minute counter to an exhausted value for sixty seconds, so a refusal naming a daily
quota is retried every minute for the rest of the day. The failure is parsed — status code and
retry-after extraction already exist — and the model is cooled down until the day boundary when
the named limit is day-scoped, for a minute when it is minute-scoped.

The dev capacity snapshot is extended to expose the daily, neuron and provider-shared dimensions
alongside the existing ones.

### Fallback that does not waste its budget

Three changes so a bad candidate never becomes a user-visible failure.

A "model does not exist" failure no longer consumes an attempt. The fallback wrapper classifies
404 and model-not-found responses separately from ordinary failures: the candidate is logged,
evicted with a cooldown measured in hours, and the loop continues without decrementing the
attempt budget. This is what turns today's three-dead-identifiers-and-you-are-out behaviour into
a non-event.

The attempt budget becomes an explicit named constant, raised for chat, and passed from each
orchestrator rather than silently inherited from the wrapper's default of three.

The non-streaming path — the one Quote drafting, Follow-up suggestions and analytics summaries
use — advances through its chain instead of aborting. It currently rethrows on any error it
classifies as non-retryable, so one 404 or one provider-specific 400 ends the request. It is
brought in line with the streaming wrapper's documented behaviour: a non-retryable error advances
to the next provider, and only an exhausted candidate list is a failure. The same path also
begins passing its token estimate into selection, which it currently omits — the direct cause of
a 4,000-token Quote draft being routed to the provider with the smallest per-minute token
allowance.

Two error classifications are corrected: context-length and request-too-large messages are
currently treated as transient. They are not — the same payload fails identically on the next
model. They route to a shrink-or-escalate path (a higher-context candidate, or compaction) rather
than a plain rotation.

### Token budgets

Prompt overhead is measured rather than guessed. The chat estimator currently adds a flat 250
tokens to cover the system prompt and every Tool schema combined; the Assistant's system prompt
alone exceeds a thousand tokens before twelve schemas are serialised. The estimator takes an
explicit overhead figure, computed once per surface from the rendered system prompt plus the
serialised Tool schemas, so selection sees a number in the right order of magnitude.

The compaction short-circuit is fixed. History compaction currently returns early whenever the
message count is under its keep-count, regardless of how many tokens those messages hold, and
replayed Tool rows are capped at 4,000 characters each — so a handful of rows sails past a
6,000-token budget. The token check becomes authoritative.

Live Tool output is truncated, not only replayed output. The same 4,000-character cap that applies
on history replay is applied when a Tool result is persisted and fed back inside the current turn,
so one large search result cannot blow the budget mid-loop.

Active Tools are narrowed per step on the Assistant surface. Twelve schemas re-sent on each of
five steps is the single largest fixed cost on the surface with the tightest budget.

Per-surface budgets are re-derived as an input, output and overhead triple. The Assistant's
current input-plus-output total is exactly Groq's entire free per-minute token allowance, which is
how one Assistant turn can consume a whole Groq minute.

### Error surfacing on the chat surfaces

Mid-stream recovery is enabled on both chat surfaces. Neither currently sets stream retries, so a
step that dies after emitting content ends the turn. With retries plus an error handler that
requests a retry, the step reruns. The pre-content case is already covered by the fallback
wrapper's head-peeking; this closes the post-content case.

Both surfaces stop returning a bare UI message stream response. Calling it without an error
handler is what collapses every failure to the string "An error occurred."; each surface passes
surface-appropriate copy instead, and the public Agent's copy points the visitor at the Inquiry
form so a failed chat still converts.

Both chat components stop rendering the raw error message. They currently print the provider's
message verbatim, so JSON error bodies appear in the transcript. They map to friendly copy;
detail stays in the logs.

The attempt trail is recorded. The fallback wrapper already exposes a per-attempt failure callback
that neither orchestrator passes. It is wired up, and the trail of candidates tried with the
reason each failed is written into the agent run's existing metadata column — no schema change,
and it delivers the fallback-phase visibility the token-budget ADR asked for.

### Catalog drift check

A script lists each configured provider's live models from its models endpoint and diffs them
against the catalog, failing on any identifier Requo names that the provider no longer serves. It
runs as part of the standard check command in listing-only mode. A separate opt-in flag makes one
minimal tool-calling request per candidate to confirm tool capability — the way the NVIDIA and
Cloudflare entries get verified rather than assumed, since both are currently marked as not
tool-capable with no evidence either way. The probe stays manual because it spends real quota.

### Removals carried by this change

- The duplicate cost estimator in the Agent's telemetry module, whose small substring table
  matches nothing the router actually serves, so every Agent run is currently priced at the
  default rate. The shared token-logger version is used instead.
- Three unused model-selection wrappers superseded by profiles.
- An unregistered Agent Tool for creating Inquiries directly, superseded by the Proposed Inquiry
  flow.
- The coding quality tier, which no surface in this product uses.
- Stale comments: two modules reference a route-handler file that does not exist, and one carries
  a limits table that is fiction.

## Testing Decisions

A good test here asserts what someone outside the module can observe: the HTTP response, the rows
that exist afterwards, and what the surface shows. It does not assert that a particular function
was called, or that selection ranked candidates in a particular internal order for its own sake.

There is one exception, and it is the same one the conversational surface tests already rely on:
the provider is a boundary, and what crosses it is a contract. Which model identifier a turn asks
the registry for, and what prompt and Tool schemas it sends, are observable facts about the
system's behaviour rather than internal detail. Asserting them is fair; asserting how selection
computed them is not.

The metering counters are treated the same way. The cache layer is where capacity accounting
leaves the process, so the counter keys and increments handed to it are the observable output of
the accounting rules — a per-organisation limit being shared, a daily counter expiring at the
provider's reset, a neuron charge — and are asserted at that boundary.

### Seams

**One seam, and it already exists. No new seam is introduced.**

The seam is the provider registry, stubbed through the shared mock-model support module that the
conversational surface tests already use. A mock language model from the AI SDK's own test
utilities stands in at the provider boundary; everything above it is real — the route handler, the
orchestrator, the routing profile, model selection, the fallback wrapper, Session and message
services, Tool execution, and the test database.

What changes is what else is stubbed alongside it. The Agent chat route suite currently replaces
the whole capacity selector with a stub that returns a single fixed model identifier, which means
selection and fallback — precisely the code this change rewrites — are never exercised. That stub
is removed. The registry stub stays, and the cache layer stub stays because it is the metering
boundary. With the selector real, a request runs the assembled chain from route handler through
profile, selection and the fallback wrapper down to the registry, and failures can be injected by
scripting the registry per model identifier: a 404 on a deliberately dead entry, a 429 naming a
per-minute limit on one candidate, a 429 naming a daily quota on another, a mid-stream failure on
a third, and a healthy model further down the chain.

Everything else this change touches is a pure function and needs no seam at all: catalog
invariants, profile ordering, capacity arithmetic, token-budget arithmetic, error classification,
and the drift check's identifier diff. They are unit-tested directly with no mocking.

### What each seam covers

Through the provider-boundary seam, driven end to end via the chat route handlers:

- A dead identifier at the head of a chain does not consume an attempt: the turn is served by a
  later healthy candidate, the response body carries its text, and the message row records the
  provider and model that actually served it rather than the first candidate.
- A chain whose first three entries all 404 still produces an answer, which is the case that today
  reports that every model failed.
- A per-minute refusal advances to the next candidate and the turn completes.
- A refusal naming a daily quota takes that model out of subsequent selections until the day
  resets, observable as the cooldown written at the cache boundary.
- A failure the current code classifies as non-retryable advances rather than ending the turn.
- A turn where every candidate fails returns the surface's own copy — not the provider's message,
  and not "An error occurred." — and the public Agent's copy names the Inquiry form.
- The run row records a failed status and an attempt trail naming each candidate tried and why it
  failed.
- A mid-stream failure after content has been emitted recovers and finishes rather than truncating.
- The prompt that crossed the boundary carries the expected system prompt and the expected Tool
  schemas for that surface, and the Assistant's narrowed active-Tool set is visible in it.
- A Proposed Inquiry already staged survives a later provider failure in the same Session.

As pure unit tests, with no seam and no mocking:

- Catalog invariants: every identifier is unique, every provider prefix is one the registry knows,
  no entry declares a Cloudflare neuron rate without being a Cloudflare entry, output limits never
  exceed context windows, and the derived cost table covers every catalog entry under the prefix
  the registry uses — the assertion that prevents the Gemini pricing gap from recurring.
- Profile invariants: every profile's ordering names only catalog identifiers, a profile that needs
  Tools lists only tool-capable entries, an excluded provider appears nowhere in that profile's
  order, reserve entries rank last, and the Quote profiles contain no provider whose per-minute
  token allowance cannot hold a full draft plus its grounding.
- Capacity arithmetic: a shared dimension is charged once at the provider scope and read as the
  worse of the two ratios; a daily counter's expiry follows the entry's declared reset; a neuron
  charge converts tokens at the entry's rates; an actuals correction moves a counter by the
  difference rather than the full amount; a day-scoped refusal produces a day-length cooldown and a
  minute-scoped one produces a minute-length cooldown.
- Token budgets: a measured overhead figure reaches the estimate; compaction trims on tokens even
  when the message count is under its keep-count; live Tool output is capped at the same length as
  replayed output.
- Error classification: context-length and request-too-large are no longer transient; 404 and
  model-not-found are their own class.
- The drift check's diff, as a pure comparison between a catalog identifier list and a supplied
  live list. The script's network shell is deliberately not unit-tested: the test suite installs an
  outbound HTTP guard that blocks any non-local request, so only the pure diff is exercised in
  tests and the live listing is verified by running the script.

### Prior art

The Agent chat route integration suite is the closest existing model for the seam work — it already
drives the real route handler against the mock provider and asserts both the streamed body and the
run row, including cases for an unavailable model becoming a 503 and a provider throwing mid-stream
being recorded as a failed run. The Agent orchestrator suite is the prior art for asserting the
prompt that crossed the boundary. The capacity selector, router and token-budget unit suites are the
prior art for the pure tests.

### Existing tests that change

- The capacity selector unit suite pins today's exact model identifiers and the current
  available-versus-stressed ordering, including an assertion that a specific Groq identifier leads.
  It is rewritten against profiles.
- The router unit suite contains cases that pin the behaviour this change deliberately inverts —
  stopping immediately on a non-retryable error, both for generation and mid-stream — and a case
  that pins the quality-tier-to-minimum-quality mapping being removed. Those are rewritten to assert
  advancement through the chain and profile-driven selection.
- The token-budget unit suite is extended for measured overhead and token-authoritative compaction.
- The Agent chat route integration suite drops its capacity selector stub and gains the injection
  cases above.
- The fallback wrapper has no test coverage today, despite every chat turn depending on it. It gains
  a unit suite covering attempt accounting, dead-identifier eviction outside the budget,
  head-of-stream versus mid-stream failure handling, and success attribution.

## Out of Scope

- Folding the importer's AI extraction into the shared router. It bypasses routing wholesale today
  with its own provider client, its own retry loop, no invocation logging and no usage recording.
  This change only moves its model identifiers into the catalog so they are covered by the drift
  check; unifying it is a separate piece of work.
- Purchasing OpenRouter credits or any other paid upgrade. The whole design assumes free tiers, and
  OpenRouter's daily allowance is treated as a last-resort overflow because of it.
- Rotating the Upstash credentials that appear to be committed to the environment example file. That
  is flagged separately and needs confirming before anything is changed.
- Any change to plan entitlements, AI usage quotas or credit weighting. Which plans get AI and how
  much they get is unchanged; only which provider serves a permitted request changes.
- New product surfaces. No new settings page, no user-facing model picker, no per-business provider
  configuration. Routing stays an opinionated default tuned by environment overrides.
- Streaming the fallback chain's progress to the client. The attempt trail is recorded server-side
  for diagnosis, not shown in the transcript.
- Changing which Tools either surface registers, beyond narrowing which are active per step.

## Further Notes

**The Gemini numbers are estimates.** Google no longer publishes per-model free-tier request limits,
and the Flash tier's daily allowance is reported to have been reduced substantially. The catalog
values for that provider are conservative guesses, which is the main reason every allowance is
environment-overridable: the first provider whose real ceiling turns out to be lower should be
correctable without a release.

**The dead identifiers were found by probing live model endpoints, not by reading documentation.**
Re-probe before implementing — more may have retired since, and the drift check exists precisely
because this list has a short shelf life.

**Metering is advisory unless the shared cache is actually reachable.** The cache layer falls back to
a per-process map when Upstash credentials are missing or invalid, in which case every counter in
this design is per-instance and resets on cold start, and the thresholds become advisory rather than
enforced. This matters most in production, where several instances each hold their own view of a
per-organisation allowance. Confirm the credentials work before concluding the metering is wrong.

**The token-budget ADR needs amending, not working around.** Its decision on turn shape records three
Tool steps and per-surface output budgets of 600 and 900 tokens; both shipped surfaces use five steps
and the Assistant uses a 2,000-token output budget. That drift predates this change, and the
re-derived budgets here should be written back into the ADR so the record matches the code. The same
ADR's decision on logging the fallback phase without raw prompts is delivered by the attempt trail
described above, and its headroom decision is consistent with the code — only the environment
example's comment describing the reserved fraction is inverted.

**Order of work, each step leaving the tree green:** catalog, then profiles, then capacity
accounting, then fallback and router hardening, then token budgets, then orchestrator error handling,
then the chat components' error copy, then the removals, then the drift script and its wiring into
the check command. The catalog has to land first because everything else reads from it, and the drift
script last because it validates what the catalog claims.

**Verification beyond the automated suites.** Run the drift check with its tool-probe flag once,
manually, to confirm every identifier is live and to settle whether the NVIDIA and Cloudflare entries
really are tool-capable. Read the dev capacity endpoint before and after a real Assistant
conversation and confirm three things: that the serving model is the intended primary, that Cerebras
now shows its real five-per-minute ceiling rather than two hundred, and that the token counter moves
by roughly the actual token count rather than the preflight estimate. Then hold a ten-turn Assistant
conversation with Tool calls and request a knowledge-grounded Quote draft; no provider error text
should reach either transcript.

**Two numbers worth remembering while implementing.** The Assistant's current input-plus-output
budget is exactly Groq's entire free per-minute token allowance, so one turn can consume a whole Groq
minute — which is why Groq sits late in the Assistant chain rather than being removed. And at the
cheapest Cloudflare entry's rates, the daily neuron pool is worth on the order of 150 chat turns,
which is a ceiling worth respecting rather than discovering.

