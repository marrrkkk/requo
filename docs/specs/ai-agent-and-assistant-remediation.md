# Agent and Assistant Remediation

## Problem Statement

Requo ships two conversational surfaces and neither one works as advertised.

A business owner who opens the Assistant inside their dashboard gets a chat window that
cannot answer them. Every message returns either a server error or a reply written as
though the owner had said nothing, because the model is handed an empty conversation. If a
reply does arrive, refreshing the page loses it: each visit silently starts a new session,
so there is no history to return to and no way to pick up yesterday's thread. The Assistant
advertises Tools for creating Inquiries and Quotes and reports success when asked to use
them, but no record is ever created — it invents identifiers and describes work it did not
do. Asked about follow-ups, it states confidently that there are none scheduled regardless
of the truth. Asked anything requiring Business Memory, it returns nothing.

A prospective customer using the Agent has a better time, but the surface is quietly
degraded. The tone the owner selected in settings has no effect; every business sounds
identical. Reloading the page blanks the transcript while the Agent keeps answering as if
it remembers, because the conversation lives only in component state. When the Agent cannot
help and escalates to a human, the Inquiry it files carries no real information — the
customer's name is recorded as "Unknown" — and nothing in the dashboard signals that a
human needs to step in. Arriving at the inquiry form from a chat, the customer is told
their details have been pre-filled when nothing has been.

Underneath both surfaces, migration history is broken in a way that makes the failures
environment-dependent and hard to diagnose. Several migrations carry timestamps that
regress below their predecessors, and the migration runner compares against the highest
timestamp already applied rather than tracking which migrations ran. On any database
migrated incrementally, the migrations that create the tables for both surfaces are skipped
permanently and silently. On a database rebuilt from scratch they all apply, which is why
the defect has gone unnoticed and why the test suite passes. Two further migrations were
never registered at all, and one duplicates a column another already adds without a guard,
so it will fail wherever both run. Schema snapshots stopped several migrations ago, which
makes the normal generate-a-migration workflow unsafe.

Finally, the owner-facing surface exposes something it should not: a browser for reading
customer conversations, contradicting the privacy boundary the product depends on.

## Solution

Repair migration history first, then make both surfaces do what the product already claims
they do, then make the promises enforceable with tests at a single seam.

The Assistant becomes a working, ChatGPT-shaped surface: a new-chat composer at the section
root, one URL per Assistant Session, a collapsible history sidebar with rename and delete,
and titles derived from the opening message. Starting a chat from the dashboard home
redirects immediately to a real session URL and delivers the first message, so the reply
streams in without a second action. Its Tools stop pretending: each write Tool calls the
same service the rest of the product calls, writes an audit record, and renders a real
result, with outbound or state-changing actions gated behind a confirmation step.

The Agent keeps its shape and gains correctness: the owner's tone reaches the model,
Qualification state advances as the conversation progresses, a completed session is marked
completed instead of being swept up as abandoned, escalations file an Inquiry containing
what the customer actually said, and a reload restores the customer's own transcript. The
misleading pre-fill notice goes away until it can tell the truth.

Both surfaces get the safety and metering the product design already specifies: input
sanitisation, output filtering, rate limits, per-plan volume limits, token accounting, and a
plan check that survives a downgrade.

The conversation browser is removed. Escalations surface instead as a flag on the Inquiry
itself, filterable in the inbox, with the transcript attached read-only to that Inquiry —
the only path by which an Agent Session ever becomes visible to the business.

## User Stories

1. As a business owner, I want the Assistant to answer the question I actually typed, so that the conversation is useful rather than confusing.
2. As a business owner, I want my Assistant Session to survive a page refresh, so that I do not lose a thread I was working through.
3. As a business owner, I want each Assistant Session to have its own URL, so that I can bookmark or return to a specific conversation.
4. As a business owner, I want a history sidebar listing my recent Assistant Sessions, so that I can resume past work without retyping context.
5. As a business owner, I want each Assistant Session titled from my opening message, so that I can recognise a conversation in the list at a glance.
6. As a business owner, I want to rename an Assistant Session, so that I can label a long-running thread meaningfully.
7. As a business owner, I want to delete an Assistant Session, so that I can clear conversations I no longer need.
8. As a business owner, I want the history list to page as it grows, so that the sidebar stays usable after months of use.
9. As a business owner, I want the Assistant section root to offer a fresh composer, so that clicking into it does not drop me into an old conversation.
10. As a business owner, I want no empty session created merely because I opened the Assistant, so that my history contains only real conversations.
11. As a business owner, I want typing into the dashboard home chat box to take me straight to a new Assistant Session with my message already sent, so that I get an answer in one action.
12. As a business owner, I want the history sidebar to collapse, so that I can give the conversation full width when reading a long answer.
13. As a business owner on a phone, I want history in a sheet rather than a sidebar, so that the chat stays readable on a narrow screen.
14. As a business owner, I want to see when the Assistant is using a Tool, so that I understand what it is doing rather than watching a blank pause.
15. As a business owner, I want Tool results rendered as structured cards, so that a list of Inquiries is scannable instead of buried in prose.
16. As a business owner, I want the Assistant to actually create an Inquiry when I ask it to, so that I can trust what it reports.
17. As a business owner, I want the Assistant to actually create a Quote when I ask it to, so that I can draft from a conversation.
18. As a business owner, I want to confirm before the Assistant sends a Quote to a customer, so that an outbound message is never sent on my behalf by accident.
19. As a business owner, I want to confirm before the Assistant changes an Inquiry's status, so that my pipeline is not altered without my say.
20. As a business owner, I want the Assistant to search my Business Memory, so that its answers reflect what I have told it about my business.
21. As a business owner, I want accurate follow-up counts, so that I am not told nothing is scheduled when something is.
22. As a business owner, I want money shown at its true magnitude, so that pipeline figures are not overstated.
23. As a business owner, I want archived and deleted records excluded from Assistant results, so that its answers match what I see in the app.
24. As a business owner, I want name search to ignore capitalisation, so that searching finds the record regardless of how it was typed.
25. As a business owner, I want a Tool failure reported as a failure, so that I do not act on a silent gap in an answer.
26. As a business owner, I want every write the Assistant performs recorded in the audit log, so that I can see what was changed on my behalf.
27. As a business owner, I want the Assistant available on every plan, so that the core operating surface is not paywalled.
28. As a business owner on a free plan, I want a clear in-conversation upgrade prompt when I reach my daily message limit, so that I understand why it stopped and what to do.
29. As a business owner, I want Assistant history kept indefinitely, so that past decisions stay retrievable.
30. As a staff member, I want the Assistant to refuse Tools my role does not permit, so that it cannot be used to bypass my permissions.
31. As a staff member, I want my own Assistant Sessions private to me, so that my drafts are not visible to colleagues.
32. As a prospective customer, I want to chat with a business without creating an account, so that I can ask a question with no friction.
33. As a prospective customer, I want the business's chosen tone reflected in replies, so that the conversation feels like that business.
34. As a prospective customer, I want my transcript restored when I reload, so that I do not lose what I have already explained.
35. As a prospective customer, I want the Agent to remember what I have already told it, so that I am not asked the same thing repeatedly.
36. As a prospective customer, I want my conversation to result in an Inquiry once enough is known, so that the business can respond.
37. As a prospective customer, I want escalation to a human to carry the details I already gave, so that I do not start over.
38. As a prospective customer, I want to be told the truth about whether a form was pre-filled, so that I do not assume work was done for me.
39. As a prospective customer, I want a working form when the Agent is unavailable, so that I can still reach the business.
40. As a prospective customer, I want my conversation invisible to the business unless it produced an Inquiry, so that browsing cannot expose me.
41. As a prospective customer, I want my transcript deleted if it never became an Inquiry, so that an abandoned conversation is not retained.
42. As a business owner, I want an escalated Inquiry flagged in my inbox, so that I notice a customer waiting on a human.
43. As a business owner, I want to filter my inbox to escalated Inquiries, so that I can work the queue that needs me.
44. As a business owner, I want the originating conversation attached read-only to an Inquiry, so that I have context before replying.
45. As a business owner, I want no way to browse customer conversations at large, so that I am not holding data I did not need.
46. As a business owner, I want the Agent to be opt-in and off by default, so that nothing public is exposed until I choose it.

47. As a business owner, I want the Agent's public link available to copy from settings, so that I can put it where my customers are.
48. As a business owner, I want Inquiries created by the Agent attributed as AI-assisted, so that my reporting reflects where they came from.
49. As a business owner, I want escalated Inquiries counted as AI-assisted too, so that attribution is not undercounted.
50. As a business owner, I want Agent and Assistant volume metered separately, so that customer traffic does not consume my own allowance.
51. As a business owner, I want the Agent restricted to paid plans, so that its cost sits with the plans that fund it.
52. As a platform operator, I want anonymous session creation rate-limited, so that an unauthenticated caller cannot mint sessions without bound.
53. As a platform operator, I want a per-session message ceiling, so that one conversation cannot run indefinitely.
54. As a platform operator, I want a per-business daily ceiling on the Agent, so that one business cannot exhaust shared capacity.
55. As a platform operator, I want untrusted input sanitised before it reaches a model with Tools, so that prompt injection is mitigated on the anonymous surface.
56. As a platform operator, I want model output filtered before display, so that unsafe content is not rendered to a customer.
57. As a platform operator, I want a plan downgrade to take effect on an existing session, so that access does not persist until expiry.
58. As a platform operator, I want token usage and cost recorded for both surfaces, so that spend is attributable.
59. As a platform operator, I want deny-all row-level security on Assistant tables, so that they match the protection already applied to Agent tables.
60. As a platform operator, I want idle sessions expired on a schedule, so that abandoned conversations do not accumulate.
61. As a developer, I want migrations to apply in a deterministic order on any database, so that an environment cannot silently miss schema.
62. As a developer, I want every migration registered, so that a file on disk is never mistaken for a migration that ran.
63. As a developer, I want migrations to tolerate re-application, so that repairing history does not break an environment that already has the schema.
64. As a developer, I want schema snapshots current, so that generating a migration is safe again.
65. As a developer, I want one model-facing seam for tests, so that a defect like an empty prompt cannot pass a green suite.
66. As a developer, I want behaviour asserted through the request boundary, so that tests survive refactors of the internals.
67. As a developer, I want Agent Inquiry creation to reuse the shared submission path, so that intake behaves identically however it arrives.
68. As a developer, I want documentation to describe what the code does, so that the next reader is not misled.
69. As a developer, I want the glossary's Agent and Assistant invariant respected everywhere, so that one word never means two things.

## Implementation Decisions

### Terminology

- **Agent** always means the customer-facing anonymous surface. **Assistant** always means the
  owner-facing authenticated surface. This holds in code, schema, tests, documentation, and
  conversation. Existing internal identifiers keep their current names; renaming tables and
  modules is churn without product value.
- Customer-facing copy calls the Agent a **chat assistant** or **public chat**. Owner-facing
  copy calls the Assistant simply **Assistant**. The settings card that manages the public
  surface is relabelled accordingly, because today it calls the customer surface "AI
  Assistant" and collides head-on with the owner surface.
- **This supersedes ADR-002's naming decision**, which assigned the label "AI Assistant" to
  the customer surface. A new ADR records the supersession and the two-surface split.
- The glossary is the source of truth for these terms and stays a glossary: no implementation
  detail. A separate architecture document describes how the two surfaces are built.

### Migration history repair

The migration runner compares each journalled migration's timestamp against the highest
timestamp already applied, rather than against the set of applied hashes. A migration whose
timestamp regresses below its predecessor's is therefore skipped permanently on any database
that already applied the predecessor. The repair:

- Make each affected migration safe to re-run: guard type creation, policy creation, and
  column addition with existence checks, and guard column drops with `IF EXISTS`. Table,
  index, and constraint statements are already guarded.
- Re-issue the unreachable migrations as new custom migrations with strictly increasing
  timestamps, so they apply on incrementally-migrated databases and no-op on rebuilt ones.
- Register the two unjournalled migrations.
- Delete the migration that duplicates a column another migration already adds; it is
  redundant once the guarded version is reachable.
- Regenerate schema snapshots so the normal generate-and-migrate workflow is safe again.
- Document the two earlier migrations that carry the same regressive-timestamp defect but
  whose statements are already idempotent, so a future reader does not "fix" them into a
  second incident.
- The invariant to hold going forward: **journal timestamps must increase monotonically**, and
  a migration must be idempotent unless it is provably applied exactly once.

This phase runs first. Nothing else in this spec can be verified against a real database
until it lands.

### Assistant conversation correctness

- The prompt must be built from the conversation **after** the incoming user turn is
  persisted, not from a snapshot taken before it. The orchestrator currently loads the
  session, inserts the user message, then builds the prompt from the stale snapshot — so the
  model receives an empty message list on the first turn and a one-turn-behind list
  thereafter. Reload the conversation, or append the new turn to the in-memory list, before
  constructing the prompt.
- A regression test at the request boundary must assert that the model receives the user's
  text. This defect shipped because the existing test asserts the *shape* of the model call
  against a stubbed module rather than the *content* reaching a model.

### Assistant session identity

- The server owns session identifiers. The client must never mint one. Today the client
  generates its own identifier format while the service generates another, so every load
  creates an orphan row and no conversation is ever found again.
- A server action creates the Assistant Session, persists the first user message, and returns
  the real identifier. The client navigates to that identifier's URL.
- Opening the Assistant section root creates nothing. The root is a composer; a session comes
  into existence only when a message is sent.
- Session state transitions:

  ```
  active ──(idle > 1 hour)──> abandoned
  active ──(explicit completion)──> completed
  ```

  The Agent already has this state machine but nothing in production calls the completion
  transition, so the expiry sweep relabels successful sessions as abandoned and corrupts the
  completion metric. Wire the completion call for the Agent; the Assistant does not need a
  completed state because its sessions are long-lived by design.

### Assistant transport

- Adopt the AI SDK's UI message stream and the framework's React chat hook, replacing the
  bespoke plain-text stream. Tool calls and Tool results cannot be represented in a text-only
  transport, which is why roughly a thousand lines of finished Tool-result UI is unreachable
  today.
- Migrate the Agent to the same transport, sequenced last, so the two surfaces converge
  without putting the working surface at risk mid-project.

### Assistant UX shell

- The Assistant section root renders a new-chat composer. Each Assistant Session lives at its
  own child URL.
- A collapsible history sidebar lists recent Assistant Sessions for the signed-in member,
  most recent first, paginated. On mobile it becomes a sheet rather than a sidebar.
- Titles are generated automatically from the first user message, truncated. A session can be
  renamed and deleted. There is no search — the list is short enough that search is a
  configuration surface without a payoff.
- Assistant Sessions are scoped to the member who created them, not shared across the
  business.
- The dashboard home chat box submits to the same server action, then redirects to the new
  session URL with the first message already persisted, so the reply begins streaming on
  arrival without a second user action.
- Pages keep the instant-navigation contract: synchronous shells with skeletons, dynamic reads
  inside suspense boundaries, independently-failing regions wrapped in error boundaries.

### Assistant Tools

- Read Tools return real data. Three of them are wrong today and must be corrected: follow-up
  statistics are computed against the wrong source and always report zero; monetary values are
  scaled incorrectly and overstate figures; archived and deleted records are not excluded; and
  name matching is case-sensitive.
- Business Memory search must actually call the retrieval service. It is currently a stub that
  returns nothing, which silently strips the Assistant of the knowledge base the product
  advertises.
- Write Tools call the same services the rest of the product calls, rather than fabricating a
  result. Inquiry creation and Quote creation currently return invented identifiers and report
  success without writing anything.
- Every write Tool writes an audit record attributed to the acting member.
- Outbound and state-changing actions — sending a Quote, changing an Inquiry's status —
  require explicit confirmation in the UI before execution. Drafting is not gated.
- Tools respect the acting member's role. A Tool the member's role does not permit is refused
  server-side, not merely hidden.
- A Tool failure is surfaced as a failure. Swallowing an error and returning a plausible empty
  result is the specific behaviour to eliminate.
- Tool results render through the existing structured result components, which become
  reachable once the transport carries Tool parts.
- Three Tools have Zod schemas but no implementation. They are out of scope here; the decision
  whether to build or delete them is deferred and recorded below.

### Agent correctness

- The session loader must select the stored agent configuration column. It does not today, and
  a type cast in the orchestrator hid the omission from the typechecker, so the owner's tone
  selection has never reached the model. Add the column to the projection and delete both
  casts so the compiler enforces the contract.
- Qualification state must be advanced as the conversation progresses. The update function
  exists and is never called.
- Session completion must be called when a conversation reaches its goal, per the state machine
  above.
- Agent Inquiry creation routes through a shared exported submission wrapper alongside the
  public and manual paths, preserving its AI-attributed source. ADR-001 already claimed this
  reuse; the code diverged. This restores the documented intent.
- Escalation to a human files an Inquiry containing the details the customer actually provided,
  rather than placeholder values.
- On load, the customer's transcript is rehydrated from the session token so a reload restores
  the conversation the customer can already see. The business gains no new visibility from
  this: the transcript is fetched by possession of the token, which only the customer holds.
- The pre-fill notice is removed now, because it tells the customer something untrue. It
  returns once qualification state is genuinely captured and can populate the form.
- Conversation history sent to the model is windowed, so a long session cannot grow the prompt
  without bound.

### Privacy boundary

- The customer conversation browser and its detail route are deleted. A business must have no
  way to browse or search Agent Sessions.
- An Agent Session becomes visible to the business only through an Inquiry it produced —
  either because the Agent created the Inquiry or because the customer escalated. The
  transcript is attached to that Inquiry as a collapsible, read-only block.
- Escalation is recorded as a dedicated boolean on the Inquiry, surfaced as an inbox filter
  chip, so a waiting customer is visible in the queue rather than only inside a transcript.
- Agent transcripts that never produced an Inquiry are purged after thirty days. Assistant
  history is retained indefinitely.
- **This supersedes ADR-002's owner conversation dashboard**, which the privacy requirement
  rules out. A second ADR records the transcript-privacy boundary and the supersession.

### Entitlements, limits, and safety

- The **Assistant is available on every plan**, including free, with volume limits by plan. It
  is the core operating surface; paywalling it entirely would gate the product on itself.
- The **Agent requires Pro or above**, with volume limits by plan. Its entitlement key already
  exists and is already Pro-gated.
- The two surfaces meter into **separate buckets**, so customer traffic never consumes the
  owner's allowance. The Assistant is limited by messages per day; the Agent by sessions per
  month with a per-session message cap. Token spend is a hard ceiling behind both.

  | Plan     | Assistant (messages/day) | Agent (sessions/month) |
  | -------- | ------------------------ | ---------------------- |
  | free     | 25                       | not available          |
  | pro      | 250                      | 100                    |
  | business | 1000                     | 500                    |

  Agent sessions additionally cap at 50 messages each.

- Reaching a limit renders the product's standard paywall component **inside the conversation
  stream**, not an inline block of upgrade prose. Navigation is never hidden by plan; the
  Assistant entry stays visible on every plan, and role is the only thing that hides
  navigation.
- The plan is re-checked in the orchestrator as well as at the request boundary, so a downgrade
  takes effect on an in-flight session rather than persisting until expiry. ADR-002 already
  specified this two-level check; only the request-boundary half exists.
- Anonymous Agent traffic is rate-limited per IP, per session, and against a per-business daily
  ceiling. No CAPTCHA: the three-layer limit is sufficient and a challenge would cost more
  conversions than it prevents abuse.
- The existing input sanitiser runs on untrusted Agent input before it reaches a model that has
  Tools. The existing output filter runs on model output before display. Neither is wired into
  either surface today.
- Token usage and estimated cost are recorded for both surfaces through the existing usage
  limiter and token log.
- Assistant tables get the same deny-all row-level security policies the Agent tables already
  carry.

### Sequencing

Migration repair, then Assistant replies at all, then the Assistant shell, then Tools stop
lying, then limits and safety, then Agent correctness, then Agent transport, then documentation
and tests. Small reviewable commits; each phase leaves the tree green.

## Testing Decisions

### What makes a good test here

A good test drives the surface the way a caller drives it and asserts what a caller can
observe: the HTTP response, the rows written, the audit record, the refusal. It does not assert
that a particular internal function was called with a particular argument shape. The central
defect in this spec — the model receiving an empty conversation — passed a green suite for
exactly that reason: the existing orchestrator test stubs the AI module entirely and asserts
the *shape* of the call it would have made, so a prompt containing no user message satisfied
it. Asserting call shape against a stub is what allowed a non-functional surface to ship.

### The seam

**Collapse to one seam: substitute the model provider, and drive every behavioural test
through the route handler.**

Today there are two LLM fakes at two different depths. The route test replaces the whole
orchestrator, so nothing below the route is exercised. The orchestrator test replaces the AI
module, so the model call is inspected but never made. Both are retired.

In their place, a mock language model from the AI SDK's own test utilities stands in at the
provider boundary — the lowest external edge in the system, which is where a fake belongs.
Everything above it is real: the route handler, the orchestrator, session and message services,
Tool execution, and a real Postgres database through the existing test database support. The
mock model can be scripted to emit text, to emit a Tool call, or to emit a Tool call followed
by text, which is what makes multi-step Tool behaviour testable for the first time.

Adopting the UI message stream makes assertions cleaner as a side effect: the response becomes
a standard typed stream, so the string-stream workaround the current route test carries
disappears, and Tool calls and Tool results become assertable where today they are invisible.

No repository test currently uses the SDK's test utilities, so this seam is new here. It is a
single new dependency-free import from a package already in use.

*This seam proposal is the one open question in this spec. If the intended seam is different,
this section changes and nothing else does.*

### What gets tested at that seam

Integration tests, database-backed, driven through the chat route for each surface:

- The model receives the user's message on the first turn and the full prior conversation on
  later turns.
- A session created by the server action is the session the next request finds; a second
  request continues the same conversation rather than starting a new one.
- The user turn is persisted before the model turn, and the assistant turn after it, with
  provider and model recorded.
- A scripted Tool call produces the real side effect: an Inquiry or Quote row exists afterwards,
  with an audit record attributed to the acting member.
- A Tool the acting role may not use is refused, and no row is written.
- A gated Tool does not execute without confirmation.
- A Tool whose underlying query fails surfaces an error rather than an empty success.
- The owner's configured tone appears in the system prompt sent to the model.
- Qualification state advances, and a completed session is marked completed rather than swept
  to abandoned by the expiry job.
- An escalation writes the escalation flag and the customer-provided details onto the Inquiry.
- A business with no Agent entitlement is refused; a plan downgrade takes effect on an existing
  session.
- Volume limits refuse at the boundary for each plan tier, in the correct bucket, without
  consuming the other surface's allowance.
- Rate limits refuse anonymous traffic per IP, per session, and at the per-business ceiling.
- Untrusted input is sanitised before reaching the model; output is filtered before returning.
- A caller with a business's credentials cannot read another business's sessions or messages,
  and the client cannot influence which business a session belongs to.
- The deleted conversation-browser routes are gone and return not-found.

Retained at their existing levels, unchanged in kind:

- **Service-level integration tests** for session and message services, expiry sweeps,
  retention purging, and Tool query correctness — including explicit cases for the four
  read-Tool bugs (follow-up source, monetary scale, archived exclusion, case-insensitive
  match), each of which is a pure query-behaviour assertion that does not need a model.
- **Unit tests** for Zod schemas, entitlement resolution, limit arithmetic, title generation
  from a first message, and history windowing.
- **Component tests** for genuinely interactive UI only: the history sidebar's collapse and
  mobile sheet, rename and delete, the confirmation step on gated Tools, and per-tier paywall
  visibility with accessibility intact.
- **End-to-end smoke** for the two journeys a user would notice breaking: home chat box →
  redirect → streamed reply, and public chat → Inquiry created.

### Prior art

The route-level and service-level integration patterns, the Postgres test-database support, and
the workflow fixture helpers all already exist in the repository and are reused as-is. The
Agent already carries substantial integration coverage across several suites; those suites are
the model to follow, with their LLM stubs replaced by the provider-level mock.

## Out of Scope

- **Renaming internal identifiers.** Schema, module, and type names keep their current wording.
  Only user-visible copy changes.
- **The three unimplemented Tools** — workflow analytics, inquiry status update, and follow-up
  scheduling — which have Zod schemas but no implementation. Building them or deleting their
  dead schemas is a separate decision, called out below.
- **Public URL restructuring.** The public chat route, the profile route, and the chat-or-form
  hub stay where they are. An earlier proposal to redirect the inquiry form into the hub was
  withdrawn: the hub is already a chooser that offers both paths, so there is nothing to
  consolidate.
- **Search over Assistant history.** Rename, delete, and pagination only.
- **Sharing Assistant Sessions between members.** Sessions stay private to their creator.
- **Voice, file upload, or image input** on either surface.
- **A customer-facing account or login for the Agent.** It stays anonymous by design.
- **Any owner-facing browse or search over Agent Sessions**, now or later. This is a product
  boundary, not a deferred feature.
- **Reworking model routing, the capacity selector, or provider fallback.** Both orchestrators'
  AI SDK usage and multi-step orchestration are correct and stay as they are.
- **Splitting the glossary and writing the two ADRs**, which happens during implementation
  rather than as part of this spec.
- **Credential rotation.** A database password was previously exposed and must be rotated before
  the migration phase runs against a shared environment. That is an operational prerequisite,
  tracked separately, not work in this spec.

## Further Notes

### Why this went unnoticed

Three independent failures reinforced each other. Every database in play was built from
scratch, so the migration runner short-circuited on an empty history table and applied
everything, hiding the ordering defect. The Assistant's only integration test replaced the
model with a stub and asserted call shape, so an empty prompt passed. And the type cast in the
orchestrator meant the missing configuration column produced no compiler error. Each defect
individually would have been caught by the layer above it; together they were invisible.

### Superseded decisions

Two decisions in the accepted ADR for the assistant UX work are superseded here, and the
supersessions are recorded in new ADRs rather than by editing the old one:

- The naming decision, which assigned "AI Assistant" to the customer surface. The two surfaces
  now have distinct names, with Agent reserved for the customer side.
- The owner conversation dashboard, which the transcript-privacy requirement rules out.

One earlier claim is restored rather than superseded: the first AI ADR documented that Agent
Inquiry creation reuses the shared submission service. The code diverged from that; this spec
brings it back.

### What is already correct

Worth stating so it is not "fixed" during implementation:

- Both orchestrators' AI SDK 6 usage, multi-step Tool loop, and streaming idioms.
- Usage-limit checking and recording, where they are wired.
- Schema shape, indexing, and cascade behaviour on both surfaces' tables.
- Tenant isolation: neither surface accepts a business identifier from the client or from model
  Tool arguments, so there is no injection path.
- The Agent's existing integration coverage, which is genuinely substantial.
- The public settings card is already scoped exactly right — an enable toggle, a tone picker,
  and the public link — and needs only its label corrected and its tone selection connected.

### Open decisions

1. **The three unimplemented Tools.** Build them, or delete their dead schemas? Leaving a schema
   with no implementation is the state that produced the fabricating Tools in the first place.
2. **The seam** described in Testing Decisions.

### Prerequisites

The migration phase runs `db:migrate` against a real database and needs a working direct-
connection credential. Rotate the previously-exposed password and update the deployment and
local environments before that phase begins.

