# Dashboard Density and Scale

## Problem Statement

A business owner who uses Requo alongside the other SaaS tools in their day finds Requo visibly oversized. In their words: the sidebar item spacing is too big, the page headers are too big, the Inquiry list and its filters and buttons are too big, and the Quote list has the same problem.

The cost is measurable, not cosmetic. On a 1440x900 viewport, roughly 455 pixels of chrome sit above the first row of the Inquiry list — page shell padding, a three-step page title, a full-width filter panel, a bordered result-count pill, and a 48-pixel table header — leaving five Inquiries visible without scrolling. The Quote list is worse: an onboarding tip banner pushes the first row far enough down that three Quotes are visible. A business owner triaging a morning of inbound work scrolls constantly through a working set that comparable products fit on one screen.

Underneath the complaint is a structural problem: size is decided in three places at once.

1. Shared primitives declare control heights, radii, and text sizes — but individual surfaces override them, so a navigation item is 38 pixels tall with its own font size while the primitive it should inherit from is 40, and a table header is 48 while its own header cells claim 36.
2. Loading placeholders hard-code their own pixel heights instead of deriving from the primitives they stand in for. Because every authenticated route paints a Static Shell before its Progressive Regions resolve, these numbers are what a member sees on every navigation, and they have drifted from the controls they represent.
3. The shared panel utilities carry no padding of their own, so all 74 surfaces that use them re-declare padding independently. There is no single value to change, and no two surfaces are obliged to agree.

The result is that the app has no density — it has 61 authenticated pages each holding a private opinion about size. A fix applied page by page would regress the moment the next page is written.

## Solution

Adopt one moderate density target, comparable to the developer-tooling SaaS the owner is measuring Requo against, and apply it in the shared layer only — primitives, layout wrappers, shared utilities, and loading placeholders — so that every authenticated surface inherits it and no surface can quietly disagree.

Concretely, for a member on a desktop viewport: interactive controls stand 32 pixels tall, table rows sit at a 52-pixel pitch, page titles are 20 to 24 pixels, the sidebar rail is 240 pixels wide with 32-pixel navigation items, and page sections are separated by 24 pixels rather than 32. On phones, controls stay at 36 pixels so they remain comfortable to tap; the compact scale engages only from the small breakpoint upward.

Alongside the numeric change, remove the structural padding that carries no information: drop the filler description from list pages that merely restates the page title, collapse the filter row to a single line and fold it into the top of the results card, render the result count as plain text instead of a bordered pill, and compress the business switcher from a four-line block into one row.

Two supporting commitments keep the result from decaying. Size overrides at individual call sites are deleted, so primitives become the only place a size is declared. Padding is baked into the shared panel utilities so there is one value to change. The design system document is then rewritten to describe the scale that exists rather than the one that used to.

The acceptance criterion is the owner's own complaint, measured: the Inquiry list at 1440x900 goes from five visible rows to roughly ten.

## User Stories

1. As a business owner, I want the Inquiry list to show around ten Inquiries on my laptop screen instead of five, so that I can see my morning's inbound work without scrolling.
2. As a business owner, I want the Quote list to fit the same number of Quotes as the Inquiry list fits Inquiries, so that the two surfaces I move between all day feel like one product.
3. As a business owner, I want Requo to look proportionate next to the other SaaS tools open in my other tabs, so that it reads as a serious tool rather than an oversized prototype.
4. As a business owner, I want the sidebar to take less horizontal room, so that more of my screen belongs to my Inquiries and Quotes.
5. As a business owner, I want sidebar navigation items packed closely enough that the whole navigation is visible without scrolling the rail, so that I can reach any section in one movement.
6. As a business owner, I want the business switcher to occupy a single row, so that the top of my sidebar is a control rather than a summary block.
7. As a business owner, I want the slug, plan, and currency details currently crowding the business switcher to live in settings, so that I see them when I look for them and not every time I navigate.
8. As a member, I want the page title to be clearly the largest text on the page without dominating it, so that I can orient myself at a glance and then read the content.
9. As a member, I want list pages to stop restating their own title as a description, so that the first row of data starts higher up the page.
10. As a member, I want detail and settings pages to keep their descriptions, so that I still get context where context is genuinely useful.
11. As a member, I want the search field, filters, and clear action on one row, so that the controls read as a single toolbar rather than a stacked form.
12. As a member, I want the result count as plain text beside the results it counts, so that a number I only glance at does not carry the visual weight of a control.
13. As a member, I want the filter row attached to the top of the results card, so that the filters and the rows they filter read as one object.
14. As a member, I want each Inquiry row to keep the customer name and email address on two lines, so that I can still tell two same-named requests apart.
15. As a member, I want buttons, inputs, selects, and dropdowns to be the same height everywhere in the product, so that a row of controls lines up without my having to notice why.
16. As a member, I want table headers to be the same height as the controls above them, so that the toolbar and the table read as one grid.
17. As a member on a phone, I want controls to stay comfortable to tap even though the desktop scale is tighter, so that the density improvement does not cost me accuracy.
18. As a member on a phone, I want the primary action on a screen to stay large enough to hit reliably, so that sending a Quote on the move does not require precision.
19. As a member on a phone, I want the mobile filter panel to keep its visible labels, so that filters stay self-explanatory where there is no room for a placeholder to carry the hint.
20. As a member using a keyboard, I want every control that shrinks to keep a visible focus ring, so that the tighter layout does not cost me my place on the page.
21. As a member using a screen reader, I want filter controls to keep their accessible names after their visible labels are removed, so that a denser toolbar is not a less usable one.
22. As a member using assistive technology, I want icon-only actions to keep their accessible labels at the smaller size, so that compact controls stay identifiable.
23. As a member, I want the page not to jump when data finishes loading, so that I do not lose the row I was about to click.
24. As a member, I want the loading placeholder to be the same size as the content that replaces it, so that a navigation feels like one paint rather than two.
25. As a member, I want the number of placeholder rows to match what the list actually shows, so that the page does not visibly resize as records arrive.
26. As a member, I want the sidebar and top bar to be the same height while loading as they are once loaded, so that the persistent shell never flickers between two sizes.
27. As a member, I want denser tables to keep their hover, selected, and expanded row treatments, so that I can still track where I am in a long list.
28. As a member, I want empty states to stay legible at the tighter scale, so that a business with no Quotes yet still gets a clear next action.
29. As a business owner on the free plan, I want locked features to stay visible and clearly locked at the new density, so that tightening the layout does not hide what I could upgrade to.
30. As a prospective customer, I want the public inquiry page and public chat to keep their current generous scale, so that a first-time visitor is not handed a dense internal tool.
31. As a business owner, I want printed and PDF Quotes to keep their existing proportions, so that a document I send to a customer is unaffected by an internal density change.
32. As a contributor, I want one place to change a control height, so that I can adjust the product's density without editing dozens of surfaces.
33. As a contributor, I want loading placeholders to agree with the primitives they stand in for, so that they cannot silently drift apart again.
34. As a contributor, I want a check that fails when a surface re-declares a size a primitive owns, so that the density we agreed on survives the next feature.
35. As a contributor, I want a check that fails when a surface adds padding the shared panel utility will silently ignore, so that a well-intentioned edit does not become a mystery.
36. As a contributor, I want the design system document to describe the scale that is actually implemented, so that reading it produces code matching the product.
37. As a contributor, I want the reason panel padding moved into the shared utilities recorded as a decision, so that the next person who hits the override does not treat it as a bug.

## Implementation Decisions

### Density target

- Adopt a single moderate density: interactive controls at 32 pixels on desktop, table rows at a 52-pixel pitch, page titles on a two-step 20-to-24-pixel scale, a 240-pixel sidebar rail with 32-pixel navigation items, and 24-pixel gaps between page sections.
- Reduce the page title from three responsive steps to two, and drop section titles one step, so heading roles stay distinguishable under the lower ceiling.
- Treat the Inquiry list at 1440x900 rendering roughly ten rows, up from five, as the acceptance measure for the whole change.

### Scope

- Apply the change to authenticated product surfaces only: the business dashboard, business settings, and the admin console.
- Leave marketing, authentication, public inquiry pages, the public Agent chat, and print and PDF rendering at their current scale. Those serve first-time visitors or produce customer-facing documents, where density is not the goal.

### Mechanism

- Change the shared layer directly. Do not introduce a density token abstraction, and do not add a user-facing comfortable/compact preference. The complaint is that one scale is wrong, not that a choice is missing.
- Make primitives the only place a size is declared. Delete per-size radius and font-size overrides from primitive variant definitions so radius and control text come from the base definition alone.

### Touch targets

- Engage the compact scale from the small breakpoint upward and keep mobile at 36 pixels, expressed as a mobile-first height with a small-breakpoint override on every control primitive.
- Keep primary mobile tap targets at 44 pixels or more, and treat the WCAG 2.5.8 AA floor of 24 by 24 pixels as a hard minimum no control may cross at any breakpoint.
- Preserve the existing base-size input text on mobile that prevents iOS zoom on focus; the density change must not reintroduce that behavior.

### Page header

- Hoist the orphaned page-action clusters that currently sit in a sibling row into the page header's existing, unused actions slot, and delete the empty spacer element that row required.
- Remove the page-header description from list pages, where it restates the title. Keep it on settings and detail pages, where it carries information.
- Leave the route metadata description untouched. It feeds document metadata, is guarded by an existing uniqueness audit, and is a separate concern from the visible header.
- Update each list route's loading shell in lockstep with its page, so the Static Shell and the resolved page agree.

### List toolbar and results container

- Collapse the filter toolbar to a single control-height row holding search, filters, and the clear action.
- Remove the visible uppercase micro-labels above filter controls and carry the hint in the placeholder instead. Preserve every accessible name through visually hidden labels or explicit ARIA labelling — the labels become invisible, not absent.
- Keep visible labels in the mobile filter sheet, where no adjacent placeholder can carry the hint.
- Merge the filter row into the top of the results card as a header strip, and remove the wrapper padding that currently floats the table inside its shell.
- Render the result count as plain muted text rather than a bordered pill.

### Table rows

- Keep two lines per row: customer name above email address. The domain model states that Customer is not a first-class entity and that customer details are denormalized fields on an Inquiry or Quote, so there is no cross-Inquiry identity and the email address is the only available disambiguator between two same-named requests. Collapsing to one line would remove information, not decoration.
- Reach the 52-pixel pitch through row padding and line height rather than by dropping the second line.

### Shell chrome

- Keep the sidebar at 240 pixels and navigation items at 32 pixels, and remove the duplicate inline width declaration in the shell frame that currently overrides the sidebar primitive. A single size may have exactly one source.
- Compress the business switcher to one row of roughly 36 pixels: avatar, business name, chevron. Move the slug, plan badge, and currency badge into settings.
- Reduce the desktop top bar from 56 to 48 pixels.
- Correct the navigation item that declares its own off-scale height and font size, so navigation inherits from the shared menu-button definition like everything else.
- Leave the getting-started checklist alone; it is onboarding content, not chrome.

### Loading placeholder parity

- Update every hard-coded dimension in the shared loading placeholders and inline fallbacks in the same change as the primitives they represent. This is mandatory rather than cosmetic: authenticated routes are configured for instant navigation, so the Static Shell paints on every navigation, and ADR 007 commits the product to dimensionally accurate skeletons and no visual popcorn. A placeholder that disagrees with its content converts a density improvement into a layout shift on every navigation.
- Move live chrome and its placeholder together in one change. Shipping a 48-pixel placeholder top bar against a 56-pixel real one would produce a visible jump on every navigation — worse than the problem being fixed.
- Match the placeholder row count to what the resolved list renders, so the shell does not visibly resize when records arrive.

### Panel padding

- Bake padding into the shared elevated-panel and soft-panel utilities so they behave like the already-padded tile utility, then delete the corresponding padding from every surface that uses them.
- Provide a documented opt-out attribute for the small number of surfaces that legitimately supply their own padding.
- The opt-out is required, not defensive. A compiled probe confirmed that Tailwind's atomic utilities and the project's custom utility classes land in the same cascade layer at identical specificity, with the custom classes emitted later in source order — so a class-level padding declaration wins over a call-site padding utility, and call-site padding stops working silently. Guarding the declaration behind a negated attribute selector restores the escape hatch:

  ```css
  .soft-panel:not([data-padding="none"]) { @apply px-4 py-4; }
  ```

  This came from a compiled cascade probe and records the mechanism, not a suggested implementation shape.

### Primitive bypasses

- Convert the raw elements that reimplement primitives — the manage-dropdown triggers and the export-popover anchors — to the shared button primitive.
- Delete the two forced-priority size overrides in the manage dialog, the oversized heading in the quote-library entry card, and the badge size override in the quote list cards.
- Leave the one raw layout class applied to a form element, where the wrapper cannot currently be used, and record it as a named cleanup target in the design system document rather than fixing it opportunistically inside a density change.

### Detail page shells

- Adopt the Quote detail pattern for Inquiry detail: the page returns only its error and suspense boundaries, and the shared placeholder supplies the page wrapper.
- Delete the duplicated local placeholder fork this replaces, and confirm the bottom padding it carried lands on the shared placeholder's wrapper.

### Sequencing

- Land the change in five stages: shared utilities and primitives; shell chrome together with all loading placeholders; targeted structural fixes on the Inquiry and Quote lists; a sweep of the remaining authenticated surfaces including the call-site padding removals; and the documentation rewrite.
- Hold a review checkpoint after the shell stage, before the structural work begins.
- Keep the density change in its own commit, separate from unrelated in-flight work.

### Documentation

- Rewrite the design system document's typography, spacing, and radius tables to the implemented scale, correct the control radius, unify control text size, and distinguish the bare toolbar container from the composed list toolbar built on top of it — the document currently names the container in prose and the composition in its example as if they were one thing.
- Record the panel-padding decision as an ADR: it is hard to reverse across dozens of surfaces, surprising to a reader who finds their padding ignored, and the result of a real cascade trade-off. Record the numeric scale, the mobile floor, and the scope boundary in the design system document instead — those are conventions, not architectural decisions.
- Leave the domain glossary untouched. Control height, row pitch, and first-row offset are implementation vocabulary and belong in the design system document; the glossary is a glossary.

## Testing Decisions

### What a good test looks like here

A density change is almost entirely expressible as class-name diffs, which makes it unusually easy to write worthless tests. Asserting that a control carries a particular height class restates the diff, breaks on every future adjustment, and proves nothing a member would notice.

Two things here are genuinely observable and worth protecting:

1. **How much of a member's working set fits on screen.** This is the complaint, and it is a rendered-layout fact, so it can only be asserted in a real browser at a real viewport.
2. **Whether the page moves under the member while data loads.** ADR 007 commits the product to dimensionally accurate placeholders; the density pass changes placeholder numbers and primitive numbers at the same time, which is exactly when that commitment breaks.

One further thing is worth protecting that is not observable at all — the invariant that produced the bug. Size leaked out of primitives into individual surfaces, and a rendered test can only catch that leak after it visibly regresses on the one route the test happens to visit. This is what a static check is for.

### Seams

Prefer the fewest seams. This needs two: one existing behavioral seam, reused, and one new static seam.

- **Reuse the existing authenticated navigation end-to-end seam.** It already signs in as the demo business owner, navigates the real shell between Inquiries, Quotes, Follow-ups and Analytics, asserts the Static Shell paints without a document reload, and already overrides the viewport for its mobile cases. Every behavioral assertion below is an addition to that spec, not a new file:
  - At the desktop viewport, the Inquiry list renders at least the agreed number of rows fully inside the viewport, counted by row geometry rather than row markup. This is the acceptance criterion, executable.
  - The results container's top offset is captured in the Static Shell state and again after the Progressive Region resolves, and must not move. This is the layout-stability commitment, executable.
  - The two existing list-page assertions on the page-header description are retargeted, since that description is deliberately deleted. The helper already takes the description as an optional argument, so list pages drop the argument and settings and detail pages keep theirs.
  - At the mobile viewport, primary actions still meet the tap-target floor.
- **Add one static density audit to the existing audit harness**, alongside the eight audits already wired into the repository's standard check command. It reuses the shared walker, offender format, and exit policy, and reports `path:line — message` so a failure is actionable from CI output alone. It fails on:
  - an off-scale control height declared in authenticated feature or placeholder code, rather than inherited from a primitive;
  - a padding utility on the same class attribute as a padded panel utility, where the cascade will silently ignore it — the single highest-value assertion here, because this failure is invisible in review and produces no error at runtime;
  - a second declaration of the sidebar width variables outside the sidebar primitive;
  - an arbitrary font-size value in authenticated feature code where a typography role already exists;
  - the container radius that the scale removes.

### Rejected seams

- **Component tests asserting class names.** Implementation detail by construction. The component suite is deliberately small and covers interactive behavior only; a density assertion there would be a diff restatement with a test runner attached.
- **Screenshot diffing as a gate.** The existing screenshot configuration is a portfolio-image generator, not a regression suite: no baselines, one worker, and font rasterization differs across machines. Screenshots stay a manual review artifact, captured against an already-running dev server with seeding disabled, because the demo seed truncates a shared remote database.

### Prior art

- The eight audit scripts and their shared harness are the model for the new audit, including the offender format and exit policy.
- The repository-scanning guard test under the unit suite is the model for a check that walks the tree and fails with a list of offenders.
- The authenticated navigation spec supplies the sign-in fixture, shell-persistence assertions, and the viewport-override pattern the mobile assertions need.
- The instant-navigation spec's own coverage of dimensionally accurate placeholders is the precedent for asserting layout stability across a Suspense boundary.

## Out of Scope

- Redesigning any surface. This changes scale and removes redundant structure; it does not change what a page contains, how a workflow behaves, or what anything is called.
- Marketing, authentication, public inquiry pages, and the public Agent chat.
- Print and PDF document rendering.
- A density token layer, a theme abstraction, or any indirection between a primitive and its size.
- A user-facing comfortable/compact preference, or persisting a density choice per member or per business.
- Changing the color, border, focus, or elevation language. Only size, spacing, and the structure that exists purely to hold spacing.
- Changing the row content of the Inquiry or Quote list beyond what density requires.
- The onboarding tip banner on the Quote list. It costs vertical room but it is onboarding behavior with its own lifecycle, and removing it is a product decision rather than a density one.
- The raw layout class on the quote editor form element, recorded as a cleanup target instead.
- Schema changes, query changes, route changes, and any change to authorization, tenant scoping, or plan gating. Plan-locked features stay visible and locked exactly as they are today.
- The domain glossary.
- Converting the remaining legacy vertical-space stacks to gap-based layout, and the other standing cleanup targets, except where a file is already being edited for density.

## Further Notes

The change is already partly implemented. The control, table, card, input, sidebar, page-header and section primitives are done, along with the page-level loading placeholders, and both typecheck and lint are clean against them.

Three files needed by the remaining work are also carrying unrelated in-flight changes: the global stylesheet, the dashboard shell frame, and the Inquiry list table. Everything structurally coupled to those was deliberately held back so the density change stays a separate commit, which also means the shell chrome and its placeholder move together rather than shipping a shell that jumps between two heights on every navigation.

Verification order for the remainder: the repository check command first, since it runs lint, typecheck and the audits including the new density audit; then the end-to-end assertions; then screenshots at the target viewport for a human look at the result.

One pre-existing failure will show up in that run and is unrelated: the test-layout guard fails because the portfolio screenshot generator lives outside the four allowed test folders. It is committed and long-standing. It should be fixed or explicitly exempted, but not silently as part of this work.

The measured baseline to compare against, at 1440x900: 455 pixels above the first Inquiry row, five visible rows, a 44-pixel navigation pitch and an 83-pixel row pitch. The projection after the full pass is roughly 220 pixels and twelve rows, against an agreed target of ten.
