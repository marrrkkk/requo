# Agent Inquiry Approval and Chat Layout

## Problem Statement

Both of Requo's conversational surfaces are unusable in the same basic way, and the
customer-facing one commits records nobody agreed to.

A business owner who opens the Assistant and holds a real conversation loses the composer.
It is not pinned to anything — it sits underneath the transcript and slides further down the
page with every reply, until the box they type into is well past the bottom of the window.
To send a second message they scroll the whole dashboard down, type, and then watch it move
again. Worse, they cannot go back and read what the Assistant told them three replies ago.
The transcript does not scroll badly; it does not scroll at all. There is no scrollbar, the
wheel does nothing, and everything above the visible messages is unreachable for the rest of
the session.

A prospective customer on a business's public chat page hits the same dead transcript, and
then hits something more damaging. The moment the Agent decides it has collected enough
information, it files the Inquiry. There is no review step. If the Agent misheard a phone
number, wrote down the wrong budget, or summarised the job in terms the person would never
have used, that is already in the business's inbox and already the first impression the
business has of them. The person is not shown what was sent, is not asked to confirm it, and
has no way to correct it — their only recourse is to start again and file a second Inquiry,
which is how a business ends up with duplicates it has to reconcile by hand.

Both composers are also visibly rounder than every other control in the product, so the chat
surfaces read as though they came from a different application.

## Solution

The chat pane claims the space below the app chrome and keeps it. The transcript becomes the
one thing that scrolls, and the composer sits below it as a fixed row of the pane — it cannot
drift, because there is no longer anywhere for it to drift to. Scrolling up works, and stays
where it is put: new output follows the bottom only while the reader is already at the
bottom, and the moment they scroll up to re-read something the surface stops yanking them
back. A quiet "Jump to latest" appears while they are reading history, and disappears when
they return.

On the customer side the Agent stops filing Inquiries. When Qualification is complete it
assembles a **Proposed Inquiry** and puts it to the prospective customer as a card in the
conversation, with every field already filled in and every field editable. They can fix the
phone number by typing in the card. They can also fix it by carrying on the conversation —
"actually the budget is closer to 2,000" updates the same card, because the card and the chat
are two views of one staged record. Nothing reaches the business until they press the send
button on the card. If they would rather not send it, Discard clears it and the conversation
carries on. After they send, the card stays in the transcript as the receipt of what was
submitted, and a reload brings both the transcript and the card back.

Requesting a human is untouched: someone asking to speak to a person still reaches the
business immediately, without an approval step in front of it.

Composer and message-bubble corners come in one step, so the chat surfaces match the rest of
the product.

## User Stories

### Owner Assistant layout

1. As a business owner, I want the Assistant composer to stay at the bottom of the chat pane no matter how long the conversation gets, so that I never have to hunt for the box I type into.
2. As a business owner, I want the composer to stay exactly where it is while I scroll the transcript, so that I can read an earlier reply and respond to it without repositioning the page.
3. As a business owner, I want to scroll up through the whole conversation, so that I can re-read what the Assistant told me earlier in the session.
4. As a business owner, I want the transcript to be the only thing that scrolls, so that the page chrome and the composer stay put and only the content moves.
5. As a business owner, I want the pane to fill the window below the dashboard chrome, so that the conversation uses the screen I have rather than pushing the page taller.
6. As a business owner on a laptop, I want the sidebar and topbar to stay visible while I chat, so that I can leave the Assistant for another part of the dashboard in one click.
7. As a business owner on a phone, I want the chat pane to sit between the top bar and the bottom navigation, so that I keep both while I type.
8. As a business owner, I want the empty state of a brand-new chat to keep the composer centred as it does today, so that starting a conversation still feels like an invitation rather than a wall of blank space.
9. As a business owner, I want the transition from the empty state to an active conversation to stay smooth, so that sending my first message does not feel like the page broke.
10. As a business owner, I want the loading state of the Assistant to have the same shape as the loaded surface, so that the composer does not jump when the real chat arrives.

### Scroll behaviour on both surfaces

11. As a reader of either surface, I want the view to follow new output while I am already at the bottom, so that a streaming reply stays in sight without me chasing it.
12. As a reader of either surface, I want the surface to stop following new output the instant I scroll up, so that reading history is not fought by the page.
13. As a reader of either surface, I want a visible way back to the newest message while I am reading history, so that I do not have to drag the scrollbar to return.
14. As a reader of either surface, I want that affordance to disappear once I am back at the bottom, so that it is not permanent clutter.
15. As a reader of either surface, I want the jump to the bottom after I send my own message to feel deliberate and smooth, so that my own send is acknowledged.
16. As a reader of either surface, I want a streaming reply to keep the bottom in view without animating on every token, so that the text is readable while it arrives.
17. As a keyboard user, I want to reach the jump-to-latest control and the composer by tab order alone, so that I can use the surface without a pointer.
18. As a screen reader user, I want the transcript to remain a coherent scrollable region, so that I can navigate the conversation with my usual controls.

### Composer and bubble styling

19. As a user of either surface, I want the composer's corners to match the rest of the product's controls, so that the chat does not look like a different application.
20. As a user of either surface, I want the message bubbles to match the composer, so that the conversation reads as one family of shapes.
21. As a business owner, I want the small Assistant box on the dashboard home to change with the others, so that the same control does not have two different shapes in one product.
22. As a user of either surface, I want the loading skeleton's composer to have the new shape too, so that nothing visibly re-rounds as the page settles.

### Proposed Inquiry — the prospective customer

23. As a prospective customer, I want to see exactly what the Agent is about to send the business, so that I know what impression it will make on my behalf.
24. As a prospective customer, I want nothing to reach the business until I say so, so that a misunderstanding in the conversation does not become a record I cannot take back.
25. As a prospective customer, I want the Proposed Inquiry to arrive already filled in, so that approving it is one action rather than a form to complete.
26. As a prospective customer, I want every field in the card editable from the moment I see it, so that correcting a phone number does not require finding an edit button first.
27. As a prospective customer, I want to correct the card by continuing the conversation, so that I can say "the budget is closer to 2,000" instead of hunting for the right field.
28. As a prospective customer, I want an edit I typed into the card to survive my next chat message, so that the two ways of editing do not undo each other.
29. As a prospective customer, I want the Agent's next revision to build on what I typed, so that it does not overwrite my correction with its earlier guess.
30. As a prospective customer, I want optional details like budget and deadline to be fillable in the card, so that I can add something the conversation never asked about.
31. As a prospective customer, I want one obvious button that sends the Inquiry, so that I am never unsure how to finish.
32. As a prospective customer, I want a quiet way to discard the proposal, so that declining does not feel like the point of the screen.
33. As a prospective customer, I want discarding to leave the conversation open, so that I can keep asking questions without starting over.
34. As a prospective customer, I want discarding to be immediate, so that I am not made to confirm a decision that costs nothing.
35. As a prospective customer, I want to be told plainly when a field I typed is not acceptable, so that I can fix it before sending rather than after.
36. As a prospective customer, I want the card to become a clear receipt after I send it, so that I can see what the business received.
37. As a prospective customer, I want to keep chatting after I send, so that I can ask a follow-up question without opening a new conversation.
38. As a prospective customer who reloads the page, I want the conversation and the pending card to still be there, so that a dropped connection does not cost me the whole exchange.
39. As a prospective customer, I want a revised proposal to replace the old one in place, so that I am never choosing between two competing cards.
40. As a prospective customer, I want the card to appear where it was proposed in the conversation, so that it reads as part of the exchange rather than a modal interruption.
41. As a prospective customer who asks for a human, I want that to reach the business straight away, so that being stuck is not made worse by another approval step.
42. As a prospective customer on a phone, I want the card to be usable at that width, so that editing a field does not require a desktop.
43. As a keyboard user, I want to move through the card's fields and reach both actions by tab order, so that I can send without a pointer.
44. As a screen reader user, I want the card announced as a form to review before sending, so that its purpose is clear without seeing it.

### Proposed Inquiry — the business

45. As a business owner, I want Inquiries in my inbox to be ones the person actually approved, so that I am not chasing details nobody stands behind.
46. As a business owner, I want fewer near-duplicate Inquiries from the same chat, so that my inbox reflects real demand rather than corrections.
47. As a business owner, I want an approved Inquiry to look exactly like one from a form, so that my workflow after it arrives is unchanged.
48. As a business owner, I want the notification, activity and follow-up behaviour on approval to match what already happens when an Inquiry arrives, so that nothing about my routine changes.
49. As a business owner, I want a Proposed Inquiry that was never approved to leave nothing behind, so that abandoned conversations do not clutter my inbox.
50. As a business owner whose plan lapses mid-conversation, I want an Inquiry a prospective customer had already been shown to still be sendable, so that a billing boundary does not silently cost me the lead.
51. As a business owner, I want the Agent's chat to stop when my plan no longer covers it, so that the gate is real.

## Implementation Decisions

### Chat pane layout

- **The chat pane gets a definite height by a scoped opt-in, not by arithmetic.** Nothing in
  the dashboard shell chain establishes a resolvable height today — it is minimum-height all
  the way down — so the pane's full-height request resolves to `auto`, the stage grows to its
  content, and the transcript's overflow rule never engages. The two Assistant routes will
  mark their wrapper with a data attribute, and a rule in the global stylesheet uses `:has()`
  to switch the shell's inset to a viewport height and thread minimum-zero down the
  intermediate wrappers for that subtree only. No other dashboard route's scrolling changes.
- **Rejected: subtracting the chrome with a viewport calculation.** The chrome that would have
  to be subtracted is two different heights above and below the large breakpoint, plus a
  variable-height banner slot, plus responsive main padding, plus a mobile bottom-nav
  allowance. Any constant would be wrong at some width and silently wrong the next time the
  chrome changes.
- **The Assistant pages swap their full-height request for grow-and-allow-shrink.** Full
  height is meaningless once the parent is a flex column with a real height, and it is what
  defeats shrinking today.
- **The transcript is bottom-aligned by an automatic top margin on a single inner wrapper, not
  by end-justifying the scroll container.** End-justifying an overflowing column is the
  specific defect behind "nothing moves": a prototype of the real class chain measured 672px
  of content in a 296px box reporting a scroll height equal to its client height, no scrollbar
  generated, and the first item sitting 374px above the container's own top edge — permanently
  unreachable. The margin variant measured a scroll height greater than the client height with
  the first item reachable. This one change fixes scrolling on both surfaces.
- **The composer stays a row of the existing three-row stage grid, outside the scroll
  container.** That makes it structurally immovable, which is stronger than sticky positioning
  and needs no offset to maintain. The empty-state grid animation is preserved as-is.

### Scroll following

- **One shared hook, used by both surfaces**, living beside the shared composer rather than
  duplicated per feature. Both surfaces currently run the same defective effect — a smooth
  scroll-into-view keyed on a value that changes on every streamed token — and both delete it.
- **Stick to the bottom only while already within roughly 64px of it.** Scrolling up detaches
  immediately; returning to the bottom re-attaches.
- **Instant during streaming, smooth on the reader's own send.** Animating per token makes
  streaming text unreadable; animating an intentional send acknowledges it.
- **The detached affordance is a small centred pill just above the composer** reading "Jump to
  latest", present only while detached, and reachable by keyboard.

### Radius

- **Changed once, in the shared composer component.** Its three consumers — the Assistant
  chat, the Agent chat, and the dashboard-home Assistant box — move together, which is the
  reason the change is made there and not per surface.
- **Message bubbles come down the same step** so composer and bubbles agree, and both loading
  skeletons are updated so nothing re-rounds as a page settles.

### Where a Proposed Inquiry lives

- **It is staged in the Agent Session's existing state column**, alongside the Qualification
  data already kept there. No schema migration. It survives a reload because the server, not
  the browser, holds it, and a session holds at most one — a revision supersedes rather than
  versions.
- The staged shape, carried over from the design work, is what the tool writes and the
  approval path consumes:

```ts
type ProposedInquiry = {
  id: string;                   // identifies this proposal for exactly-once consumption
  values: CreateInquiryParams;  // every field the inquiry-params schema accepts
  proposedAt: string;
  status: "pending" | "approved" | "discarded";
  inquiryId?: string;           // set once approved
};
```

- **The Agent Session gains no new status.** Pending, approved and discarded are properties of
  the proposal; the session's own lifecycle is unchanged until approval completes it.

### The model loses commit authority

- **The inquiry-creating tool becomes a proposing tool.** It is renamed to `propose_inquiry`,
  it writes the staged proposal and returns it, and it commits nothing. The tool registry, the
  tool's label in the customer chat's progress text, and the orchestrator's system-prompt rule
  that told the model to create an Inquiry all change with it.
- **The only path from proposal to Inquiry is a server action authorised by the session
  token**, mirroring the Assistant's existing staged-confirmation pattern: a row-locked
  read-modify-write that consumes the proposal exactly once, so a double-click or a replayed
  request cannot produce two Inquiries.
- **The Agent proposes as soon as the required Qualification fields are collected.** Optional
  fields are left for the card; waiting for them in conversation is what makes chat intake
  tedious.
- **The orchestrator is given the currently staged proposal** so a revision starts from the
  current values rather than re-deriving them from the transcript.

### The card and its two editing paths

- **Every field the inquiry-params schema accepts is editable.** The card validates against
  that schema in the browser, and the approval path re-validates the posted values on the
  server. The posted body is never trusted.
- **Card edits ride along on the existing chat request body.** Every send persists the current
  card values to the staged proposal before the model runs, which is what makes chat revision
  and manual editing compose instead of clobbering each other. Approval posts them too.
- **Accepted gap:** an edit typed into the card is lost if the tab reloads before the next send
  or approval. Persisting on each keystroke would mean a write per character; persisting on
  blur was judged not worth the extra path.
- **The card reaches the browser two ways.** During a live turn it renders from the proposing
  tool's output part in the stream. After a reload the Agent Session endpoint returns the
  staged proposal alongside the transcript it already returns. Server state is authoritative in
  both cases.

- **This is the first thing the customer surface renders from a tool part.** That surface
  deliberately strips all tool traffic from its transcript today. The carve-out is intentional
  and narrow — one tool, one card — and is recorded in the Agent and Assistant architecture
  document. The transcript privacy boundary is unaffected: nothing new is exposed to the
  business.
- **The card renders inline where it was proposed**, and a superseding proposal replaces it in
  place rather than stacking a second card in the conversation.
- **The card is always editable — no read-only summary with an edit toggle.** Live inputs from
  first paint, one primary send action labelled for sending the Inquiry, and the card headed as
  something to review before sending.
- **Discard is a quiet, low-emphasis secondary beside send.** It clears the proposal, tells the
  model it was declined so the conversation can respond sensibly, leaves the chat open, and
  asks for no confirmation.

### Approval and its aftermath

- **On approval the Inquiry is created through the existing Agent submission path**, so
  notifications, activity, duplicate detection and downstream follow-up behaviour are exactly
  what they are today.
- **The Agent Session is completed and records the Inquiry it produced.** The card becomes its
  submitted, read-only state in place.
- **The composer stays live after approval.** Session loading is guarded on expiry only, so a
  completed session still accepts messages; this comes free and lets someone ask a follow-up
  question.
- **Approval and discard each persist a tool row plus a short assistant line**, mirroring the
  Assistant's confirmed-action rows, so a reloaded transcript says what happened rather than
  ending abruptly.
- **Errors from the approval path must not reuse the phrases the customer client treats as a
  dead session.** That client string-matches a small set of messages and wipes the stored token
  when it sees one; an approval failure must not throw the visitor out of their own
  conversation.

### Deliberate asymmetries

- **Requesting a human stays ungated and immediate.** It is the second path that creates a
  record for the business, and it is not being changed: someone who is stuck should not meet
  another approval step. Two commit paths with different rules is a decision, not an oversight,
  and is documented as such.
- **If the plan or the Agent toggle lapses between proposal and approval, the staged proposal is
  still honoured.** Further model work stops, because the chat is the gated feature, but Inquiry
  intake is not gated — a free-plan business still receives Inquiries from its public forms, and
  the submission path takes no plan argument. The lapse is logged. Both entitlement checks are
  re-run at approval time.

### Vocabulary and records

- **"Proposed Inquiry" is the domain term**, with the tool named for proposing and the state key
  matching. The person on the Agent surface is a *prospective customer* in prose and a *visitor*
  in code and comments; "user" is reserved for authenticated account holders. The project
  glossary has already been amended with the term, the revised Agent autonomy level, and this
  reserved word.
- **A new architecture decision record** captures the friction-versus-accuracy trade-off, why
  requesting a human stays ungated, why commit authority left the model, and the
  honour-the-staged-proposal exception in its consequences.
- **The Agent and Assistant architecture document** is updated for the new commit path, the
  two-path asymmetry, and the tool-part carve-out on the customer surface. The naming and
  transcript-privacy decisions it rests on are unchanged.

## Testing Decisions

A good test here asserts what someone outside the module can observe: the HTTP response, the
rows that exist afterwards, and what the surface shows. It does not assert that a particular
function was called, and it does not reach into component internals. The one apparent
exception is checking what the model was asked — the prompt and tool inputs it received — and
that is legitimate because the provider is a boundary, and what crosses it is a contract.

### Seams

Three seams, all of which already exist in the codebase. No new seam is introduced.

- **The provider seam** — a mock language model standing in at the model registry boundary. It
  is already documented in the codebase as the single model-facing seam for conversational
  surface tests, and everything above it stays real: the route handler, the orchestrator,
  session and message services, tool execution, and a real test database. It can be scripted
  to emit a tool call, text, or a tool call followed by text, which is exactly the shape of a
  propose-then-explain turn. This is the highest seam available for the server-side flow and
  carries most of the new coverage. Prior art: the Agent chat route suite, the Assistant chat
  route suite, and the Agent orchestrator suite all drive it this way.
- **The server-action seam** — importing an exported action and calling it against the test
  database. Approval is not reachable through the chat route, so it is covered here. This is
  not a new kind of seam: other features' actions are already tested exactly this way; it is
  new only for the Agent feature.
- **The browser network seam** — Playwright fulfilling the chat endpoint with a deterministic
  message stream, because provider keys are deliberately absent in the Playwright environment.
  This is the only seam that can see layout, scrolling and card interaction, and both existing
  conversation specs already use it.

The tool-level seam that the current inquiry-creation suite uses for the inquiry-creating tool
is deliberately **not** carried forward for proposing. Those assertions move up to the provider
seam, where the same behaviour is observable one level higher, and that suite is left covering
the human-handoff tool, whose behaviour is unchanged.

### What each seam covers

At the provider seam:

- A turn that proposes leaves a staged Proposed Inquiry on the session and **no Inquiry row**.
- A second proposing turn supersedes the first; the session still holds exactly one proposal.
- Card values sent with a chat request are persisted before the model runs, and the prompt the
  model receives contains those values rather than its own earlier guess.
- A conversational correction produces a revision whose values reflect the correction.
- The human-handoff path still creates its record immediately, with no proposal involved.
- An abandoned session — proposal staged, nothing else — leaves no Inquiry behind.

At the server-action seam:

- Approval creates exactly one Inquiry with the approved values, completes the session, and
  records the resulting Inquiry against it.
- Two approvals of the same proposal — sequential and concurrent — produce one Inquiry, not two.
- A session token for one business cannot produce an Inquiry for another.
- A posted body that would fail validation is rejected on the server even though the browser
  would have caught it first, and a body with fields the schema does not accept cannot smuggle
  them through.
- The public rate limit applies.
- With the Agent switched off or the plan lapsed: chat is refused, and the already-staged
  proposal is still approvable.
- Failure messages never contain the phrases the customer client reads as a dead session.
- Discard clears the proposal, leaves the session usable, and creates nothing.

At the session endpoint, covered as an ordinary route test: a reload returns the staged proposal
alongside the transcript, and returns nothing extra when no proposal is staged.

At the browser seam:

- The prospective customer flow end to end: the card appears, a field is edited, a chat message
  revises it, and sending produces the submitted state.
- Discard clears the card and the conversation continues.
- On both surfaces, after enough turns to overflow: the transcript's scroll height exceeds its
  visible height, scrolling up moves the content and it stays where it was put, and the composer
  is still inside the viewport.
- The jump-to-latest affordance appears when detached and goes away on return.

As a component test, with the existing component suites as prior art: the card renders every
field as an editable control, surfaces a validation message for a bad value, exposes both
actions to the keyboard, and renders its submitted state as read-only.

### Existing suites that change

The inquiry-creation suite loses its inquiry-creating-tool cases and keeps its handoff cases. The
multi-inquiry suite is rewritten: more than one Inquiry from a single session is still supported,
but each one now requires its own approval. The session lifecycle suite gains the proposal states.
Both conversation specs gain the scroll and composer assertions.

## Out of Scope

- **Business-side approval workflows.** Nothing is being added on the business side — no routing,
  no sign-off, no review queue in front of the inbox. The only approval in this spec is the
  prospective customer approving the record that describes them.
- **Owner-side confirmation for Assistant tools.** That already exists and is untouched; this
  work mirrors its pattern rather than changing it.
- **Making the human-handoff path require approval.** Deliberately excluded.
- **Versioning or history of Proposed Inquiries.** A session holds at most one and a revision
  supersedes it. No audit trail of superseded drafts.
- **Attachments on a Proposed Inquiry.** The card edits the fields the inquiry-params schema
  already accepts; file upload on the chat surface is a separate piece of work.
- **Editing or withdrawing an Inquiry after approval.** Once approved it is an ordinary Inquiry
  and follows the ordinary rules.
- **New notification, email or follow-up behaviour on approval.** The existing intake path is
  reused precisely so that nothing downstream changes.
- **Any schema migration.** The proposal lives in a column that already exists.
- **Persisting card edits before the first send.** Accepted gap, stated above.
- **Making the Agent transcript visible to the business.** The transcript privacy boundary is
  unchanged.
- **Changing scroll behaviour on any other dashboard route.** The height opt-in is scoped to the
  Assistant routes for exactly this reason.
- **A general design-system radius change.** One step on the chat composer and bubbles only.

## Further Notes

- The scroll diagnosis was measured on an isolated reproduction of the real class chain, not on
  the running application. Both fixes need re-verifying in the app before this is called done.
- The two paths that can create a record for a business now have different rules — proposing is
  gated behind approval, handoff is not. This is intentional and is the main thing the new
  decision record exists to explain.
- The project glossary has already been updated: **Proposed Inquiry** is defined, the Agent's
  autonomy level is described as assisting rather than fully autonomous, the Abandoned lifecycle
  state covers a proposal that was never approved, and "user" is reserved so that the person on
  the Agent surface is not called one.
- The reason a lapsed plan still honours a staged proposal is that Inquiry intake was never a
  paid feature: a free-plan business receives Inquiries from its public forms today, and the
  submission path takes no plan argument. The chat is what the plan buys.
- The layout and radius changes are independent of the approval flow and can land first; they
  are what is currently blocking ordinary use of both surfaces.

