# Mobile Dashboard Layout Overhaul

## Purpose

Refine Requo's authenticated dashboard into a mobile-first application experience while preserving the desktop sidebar. The pass targets the core owner workflow:

`inquiry -> quote -> share/send -> follow-up -> accepted/rejected`

The mobile experience should feel intentional on a phone, not like the desktop dashboard compressed into a narrow viewport.

## Product Decisions

- Keep the desktop sidebar for `lg` and larger viewports.
- Use a five-destination mobile bottom navigation:
  - Home
  - Inquiries
  - Quotes
  - Follow-ups
  - More
- Move business switching into a compact control in the mobile top app bar.
- Move the user profile menu into a top-right avatar in the mobile top app bar.
- Keep notifications in the top app bar beside the profile avatar.
- Use compact app-like record rows for mobile inquiry and quote lists instead of large nested cards.
- Keep touch targets accessible. Reduce perceived size through hierarchy, spacing, and progressive disclosure rather than shrinking controls below usable dimensions.
- Apply the shared shell changes to the authenticated settings shell as well, but do not redesign all settings content in this pass.

## Grill Findings

The existing mobile layout has structural problems that cannot be solved by simply reducing font sizes:

1. The bottom navigation gives one of five prime destinations to the business logo. Business switching is important, but it is not a daily workflow destination.
2. Profile access is buried inside the `Others` sheet, which makes account actions hard to discover.
3. The bottom navigation labels and icon treatment are visually light, while the center business control is disproportionately large.
4. Inquiry and quote pages stack a large page header, full-width actions, a bordered toolbar, and tall cards with nested bordered metadata tiles.
5. The current mobile cards repeat desktop information architecture instead of prioritizing scanning and fast opening of a record.
6. Export, archive, and management actions compete visually with the primary create action.
7. Fixed navigation and bulk-action surfaces need explicit coordination so they do not cover content or one another.

## Scope

### Included

- Shared dashboard mobile shell.
- Mobile top app bar and profile access.
- Mobile bottom navigation and More sheet.
- Home.
- Inquiries list, detail, and quick-add flows.
- Quotes list, detail, and create/editor flows.
- Follow-ups.
- Forms.
- Analytics.
- Related loading skeletons and fixed-position action surfaces.
- Shared mobile typography, spacing, toolbar, and list patterns.

### Excluded

- Desktop sidebar redesign.
- Database, route, or product-workflow changes.
- Full redesign of every settings page.
- Reintroducing product areas that are currently removed in the working tree.
- New gestures, swipe-only actions, or mobile-only business logic.

## Implementation Plan

### 1. Mobile Shell

Update the dashboard shell frame and mobile navigation components.

#### Top app bar

Below `lg`, render a compact top bar with this structure:

```text
[business avatar] [current page title] [notifications] [profile avatar]
```

- Business avatar opens the existing business switcher.
- The title is derived from the active route and remains readable on nested pages.
- Notification behavior remains unchanged.
- Profile avatar opens user settings, business settings when permitted, billing, business management, appearance, and sign out.
- Use fixed dimensions for the avatar and icon controls to prevent layout shift while streamed slots load.
- Keep the top bar sticky and account for safe-area and scrolling behavior.

#### Streamed shell slots

Add a dedicated streamed mobile identity/control slot to `DashboardShellFrameProps` and the authenticated business layout. It should reuse the existing cached shell/profile/business queries where possible.

The existing desktop `businessSwitcherSlot` and `userMenuSlot` remain responsible for the sidebar. Do not force the full desktop menu markup into the mobile top bar.

#### Bottom navigation

Replace the current five-item layout with:

```text
Home | Inquiries | Quotes | Follow-ups | More
```

- Remove the oversized center business switcher.
- Rename `Others` to `More`.
- Use one consistent icon-and-label treatment for all five destinations.
- Keep each item at least 44px tall and provide visible pressed and active states.
- Active state must work for nested inquiry, quote, follow-up, and detail routes.
- Preserve role gating for Analytics in the More sheet.
- Keep Forms, Analytics, Members, settings, checklist, and other secondary destinations in More.
- Business switching and profile access do not belong in More once the top bar controls exist.

#### Safe areas and fixed surfaces

- Reserve content space for the bottom bar using its actual height plus `env(safe-area-inset-bottom)`.
- Ensure the bulk action bar sits above the bottom navigation when both are visible.
- Keep sheets and dialogs within the existing overlay and focus-management patterns.
- Support reduced motion through the existing motion tokens and media query rules.

### 2. Shared Mobile Layout Rules

Update shared layout utilities rather than adding isolated page-level overrides.

#### Typography

- Mobile page titles: approximately 21–22px, with the existing larger scale restored from `sm` upward.
- Mobile section headings: compact heading role, generally 16–18px.
- Body copy: readable 14–16px depending on context.
- Inputs: retain at least 16px text to avoid iOS automatic zoom.
- Metadata: use the existing `meta-label` treatment, but avoid excessive uppercase labels in dense rows.
- Preserve line-height and contrast requirements from `DESIGN.md`.

#### Spacing

- Reduce mobile page rhythm from the current 24px-plus gaps to a compact 16–20px rhythm where appropriate.
- Reduce card and toolbar padding on phones while preserving readable hit areas.
- Avoid nested bordered surfaces when a divider or unframed section is sufficient.
- Keep the existing semantic surface tokens and radius scale.

#### Actions

- Show one clear primary action per screen.
- Avoid making every action full width on mobile.
- Keep primary actions visible and easy to reach.
- Move export, archive, delete, duplicate, and other secondary actions into an overflow menu or compact icon actions with accessible labels.
- Do not shrink interactive controls below accessible touch dimensions merely to make them visually smaller.

### 3. Inquiry and Quote Lists

Create a shared mobile record-row composition for the two list surfaces. Feature components provide their own status, metadata, and action content.

The shared pattern should support:

- Leading selection control.
- Primary title.
- Supporting customer or contact text.
- Status and record-state badges.
- One concise metadata line.
- Trailing navigation affordance.
- Existing optimistic list motion state.
- Existing bulk-selection behavior.

#### Inquiry row

Prioritize:

- Customer name.
- Inquiry status.
- Email or contact handle.
- Service/category.
- Channel and submitted date as compact metadata.
- Duplicate indicator when present.

Remove the three nested `info-tile` blocks from the mobile presentation.

#### Quote row

Prioritize:

- Quote number and title.
- Quote status and archived state.
- Customer.
- Total amount.
- Valid-until date.
- A compact reminder or viewed-without-response indicator.

Avoid rendering multiple large reminder badges when a single concise indicator can communicate the same state.

#### Breakpoint behavior

- Keep the existing desktop tables for `xl` and larger viewports.
- Use the compact row presentation below `xl`.
- Ensure the mobile/tablet presentation never introduces horizontal scrolling.

### 4. List Toolbars and Filters

Refine `DataListToolbar` for narrow screens.

#### Mobile toolbar layout

```text
[search field                         ] [filter icon/button]
[result count] [active filter summary]       [clear when needed]
```

- Keep search prominent.
- Replace the large full-width `Filters` action with a compact control while preserving an accessible visible label or tooltip.
- Keep status, form, and sort controls inside the existing bottom sheet.
- Preserve immediate filtering behavior unless a later implementation review demonstrates that an explicit Apply action materially improves usability.
- Hide explanatory toolbar descriptions on very narrow screens when they duplicate the page title.
- Keep clear-filter behavior discoverable and accessible.

### 5. Inquiry and Quote Detail/Create Screens

Apply the same mobile hierarchy to detail headers and editor surfaces.

- Reduce mobile detail-header title size and vertical padding.
- Keep status and record-state metadata near the title.
- Show one primary action first.
- Group management, export, preview, archive, delete, and other secondary actions under overflow or compact controls.
- Avoid repeated full-width buttons when a compact action group is sufficient.
- Preserve the existing quote editor calculations, line-item behavior, inquiry actions, permissions, and server actions.
- Ensure detail content has enough bottom padding to remain visible above mobile navigation and any sticky action surface.

### 6. Other Core Pages

Audit and refine the shared composition on:

- Home: prioritize the greeting, next workflow actions, and attention queue; reduce decorative or repeated panel padding.
- Follow-ups: keep the search control and due-state columns usable on phones; ensure detail dialogs fit narrow screens.
- Forms: preserve compact list rows and make create/manage actions easy to reach without stacked oversized controls.
- Analytics: keep date-range selection compact, make tabs horizontally safe, and prevent chart panels from forcing page overflow.
- Loading states: match final mobile dimensions and spacing to avoid layout jumps.

## Public Interfaces and Component Changes

Expected interface updates:

- `DashboardShellFrameProps`: add a dedicated mobile identity/control slot.
- `MobileBottomNavProps`: remove desktop-sized business and user menu responsibilities; retain only data needed for role-gated More items and checklist content.
- Shared mobile record-row component: define typed slots for title, supporting text, status, metadata, selection, and navigation.
- Optional compact/mobile presentation props for business switcher and user menu components, if required by the existing slot architecture.

Do not change public routes, query parameter names, database schemas, authorization rules, or server action contracts.

## Accessibility and Interaction Requirements

- All icon-only controls require accessible labels or tooltips.
- Maintain visible focus rings.
- Keep touch targets at least 44px with at least 8px spacing between adjacent controls.
- Do not rely on hover for any mobile interaction.
- Preserve keyboard navigation and logical screen-reader order.
- Do not use color alone for active, warning, duplicate, or reminder states.
- Respect `prefers-reduced-motion`.
- Never disable browser zoom.

## Verification Plan

### Automated checks

Run:

```bash
npm run check
npm run test
npm run build
```

Add focused component coverage for:

- Bottom-nav destination rendering.
- Nested-route active-state resolution.
- Role-gated More-sheet items.
- Profile-menu access from the mobile top bar.
- Business-switcher access from the mobile top bar.
- Inquiry and quote row navigation and selection.
- Existing filtering, pagination, bulk actions, reminders, and optimistic list behavior.

### Browser verification

Verify the following viewport sizes:

- 375x812.
- 390x844.
- 430x932.
- 768x1024.

Check Home, Inquiries, Inquiry detail, Quotes, Quote detail/editor, Follow-ups, Forms, and Analytics.

Acceptance criteria:

- No horizontal page scrolling.
- No text or controls overlap.
- No content is hidden behind the bottom navigation.
- Bulk actions do not collide with the bottom navigation.
- Profile and business switching are discoverable from the top bar.
- Primary actions are obvious without making every control full width.
- Inquiry and quote rows are scannable within one compact viewport unit each.
- Desktop sidebar and desktop table layouts remain unchanged.
- Loading states preserve the final geometry.

## Working-Tree Assumptions

- Existing unrelated modifications, deletions, and untracked files in the working tree belong to the user and must not be reverted.
- Current removed product areas remain removed unless separately requested.
- The implementation should preserve Requo's existing semantic tokens, shared wrappers, instant-navigation requirements, and owner-led workflow positioning.
