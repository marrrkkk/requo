# Requo UI System

This document defines the canonical UI system for Requo. Use `shadcn/ui` primitives, Requo design tokens, and shared layout wrappers before introducing page-level styling.

## Design Principles

- Build on the existing system. Prefer `components/ui/*`, `components/shared/*`, and semantic tokens from `app/globals.css` over custom markup.
- Use semantic styling. Reach for `bg-primary`, `text-muted-foreground`, `surface-card`, `control-surface`, and existing variants before raw palette utilities.
- Keep primitives stable. Use `className` for layout, width, placement, and composition. Do not restyle button, input, card, or overlay visuals per feature.
- Favor reusable patterns. Forms, list pages, dashboards, and empty states should share the same composition and spacing rules.
- Accessibility is default behavior. Maintain contrast, visible focus states, semantic headings, `aria-invalid`, disabled states, and accessible labels for icon-only actions.

## Design Tokens

### Color System

Use semantic tokens, not raw color classes, for all product UI.

| Token | Role | Light | Dark |
| --- | --- | --- | --- |
| `background` | App background | `#f7f9f7` | `#121212` |
| `foreground` | Primary text | `#172b24` | `#ededed` |
| `primary` | Primary actions and emphasis | `#008060` | `#008060` |
| `primary-foreground` | Text on primary surfaces | `#f4fffb` | `#f4fffb` |
| `secondary` | Subtle surface/action | `#f0f3f1` | `#1f1f1f` |
| `muted` | Muted surface | `#eef2ef` | `#171717` |
| `muted-foreground` | Supporting text | `#5f756c` | `#8b9092` |
| `accent` | Hover/selected accent surface | `#e5f5ee` | `#242424` |
| `destructive` | Error and destructive actions | `#c9372c` | `#c9372c` |
| `border` | Borders and dividers | `#d6ddd8` | `rgb(255 255 255 / 0.07)` |
| `input` | Control border base | `#d6ddd8` | `rgb(255 255 255 / 0.08)` |
| `ring` | Focus ring | `#1b9b79` | `#1b9b79` |

Extended token groups:

- `surface-*`: elevated cards, soft panels, section shells, footers, and muted surfaces.
- `control-*`: interactive controls, hover states, primary/destructive control shadows.
- `overlay-*`: dialog, sheet, select, and popover surfaces.
- `table-*`: table header, footer, hover, and selected row states.
- `sidebar-*`: sidebar background, text, border, accent, and ring tokens.
- `radius-*`: derived from `--radius`; use the existing scale instead of hard-coded radii.
- `motion-*`: shared durations, easing, and lift distance for subtle motion.

State rules:

- Focus uses `ring`.
- Error uses `destructive`.
- Disabled uses lower emphasis, muted surfaces, and reduced opacity.
- Success, warning, and info are not global product tokens yet. Use centralized component patterns only; do not introduce raw `emerald`, `amber`, `blue`, or similar utility colors in feature code.

### Typography Scale

Fonts:

- `font-sans`: Geist Sans
- `font-heading`: Geist Sans
- `font-mono`: Geist Mono

Use role-based typography instead of ad hoc text sizes.

| Role | Standard treatment | Use |
| --- | --- | --- |
| Display hero | `font-heading text-5xl leading-[0.96] font-semibold tracking-tight` | Marketing and auth hero only |
| Page title | `font-heading text-[2rem] sm:text-[2.3rem] leading-tight font-semibold tracking-tight` | `PageHeader`, detail headers |
| Section title | `font-heading text-lg leading-tight font-semibold tracking-tight` | `CardTitle`, `DashboardSection` |
| Form section title | `text-[0.95rem] font-semibold tracking-tight` | `FormSection` titles |
| Body | `text-sm leading-6` | Default UI copy |
| Supporting body | `text-sm leading-6 text-muted-foreground` | Descriptions and help text |
| Long-form supporting | `text-sm leading-7 text-muted-foreground` | Page descriptions and detail copy |
| Field label | `text-sm leading-[1.35] font-medium` | `FieldLabel` |
| Meta label | `text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted-foreground` | Filters, eyebrow labels, meta chips |
| Caption/code | `font-mono text-[0.72rem]` | IDs, tokens, technical metadata |

### Spacing and Radius

Use a compact spacing scale consistently: `1.5`, `2`, `2.5`, `3`, `4`, `5`, `6`, `8`, `10`, `12`, `16`.

Spacing rules:

- Prefer `gap-*` over `space-y-*` and `space-x-*`.
- Use `gap-2` to `gap-3` for tight control groups and inline actions.
- Use `gap-4` to `gap-6` for card bodies, form sections, and stacked content.
- Use `gap-6` to `gap-8` for page sections and dashboard page flow.
- Use `px-4 sm:px-6 xl:px-8` and matching `py-*` for page shells and major surfaces.
- Use `px-6 py-6` as the default card section rhythm, with `size="sm"` only for compact surfaces.

Radius rules:

- Controls: `rounded-lg`
- Cards, tables, sections, empty states: `rounded-xl`
- Large overlays: `rounded-2xl`
- Avoid arbitrary radius values in feature code unless the value is promoted into tokens or shared classes.

### Motion

- Use the shared motion tokens: `--motion-duration-fast`, `--motion-duration-base`, `--motion-duration-slow`, `--motion-ease-standard`, `--motion-ease-emphasized`.
- Motion should clarify interaction, not decorate the UI.
- Use subtle lift, shadow, opacity, and panel transitions. Avoid flashy animation or large movement on core product pages.

## Component Standards

### Naming Convention

Variant names should stay consistent across primitives:

- `default`: standard or primary presentation
- `secondary`: subdued emphasis
- `outline`: bordered neutral action
- `ghost`: low-emphasis action
- `destructive`: irreversible or error-related action
- `link`: text-only action

Size names should stay consistent where supported:

- `xs`, `sm`, `default`, `lg`
- `icon`, `icon-xs`, `icon-sm`, `icon-lg` for square icon actions

Do not invent new variant or size names in feature code. Add a new name only if it will be shared across the system.

### Buttons

- Always use `Button`.
- Use `variant="default"` for the primary action in a section or dialog.
- Use `outline` or `secondary` for secondary actions, `ghost` for low-emphasis actions, `destructive` for irreversible actions, and `link` for inline navigation.
- Place icons with `data-icon="inline-start"` or `data-icon="inline-end"`.
- Loading state is `disabled` + `Spinner`; keep the text label visible.
- Icon-only buttons must include an accessible label with visible text or `sr-only` content.

### Inputs, Selects, and Textareas

- Use `Input`, `Textarea`, `Select`, `SelectTrigger`, and `SelectContent` from `components/ui/*`.
- These controls share the same `control-surface` visual language. Do not override their color, border, or focus styling in page code.
- Use `FieldGroup`, `Field`, `FieldLabel`, `FieldContent`, `FieldDescription`, and `FieldError` for form structure.
- Validation rules:
  - `data-invalid` on `Field`
  - `aria-invalid` on the control
  - `disabled` on the control and `data-disabled` on the field wrapper when needed
- Keep labels above controls by default. Use responsive horizontal field layouts only through the shared field orientation APIs.

### Cards, Empty States, Alerts, and Badges

- Use full card composition: `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
- Use `DashboardSection` for standard dashboard content blocks instead of rebuilding card structure.
- Use `Empty` for empty states, `Alert` for inline notice or error messaging, `Badge` for compact status/metadata, `Skeleton` for loading placeholders, and `Spinner` for active async work.
- Keep badges semantic. Prefer `default`, `secondary`, `outline`, or `ghost` over raw status colors.

### Dialogs, Sheets, and Tabs

- Use `Dialog` for blocking flows and focused modal tasks.
- Use `Sheet` for contextual side panels, mobile filters, and temporary secondary workflows.
- `DialogTitle` or `SheetTitle` is required, even if visually hidden.
- Keep overlay content within the shared header/body/footer structure. Preserve close controls and focus-visible states.
- Use `Tabs`, `TabsList`, and `TabsTrigger` with `variant="default"` or `variant="line"` only.

### Tables and Lists

- Standard list pattern: `DashboardToolbar` + `DashboardTableContainer` + `Table`.
- Use table helper classes and shared text treatments for row titles, supporting text, and metadata.
- Empty state uses `Empty` or the shared list empty wrapper.
- Loading state uses `Skeleton`; async filtering/search uses `Spinner`.
- Selected, hovered, and expanded row states should come from the existing `table-*` tokens and classes.

## Layout Guidelines

### Forms

- Standard form composition: `FormSection` + `FieldGroup` + `Field` + `FormActions`.
- Group related controls into sections with a clear title and short description.
- Default to one-column forms. Use responsive splits only when it improves scanning and does not hurt completion.
- Keep form actions at the end of the section or page, aligned with the shared `FormActions` patterns.

### Dashboards and Detail Pages

- Standard page composition: `DashboardPage` + `PageHeader` + shared section wrappers.
- Use `DashboardSection` for bounded content areas.
- Use `DashboardDetailLayout` for two-column detail pages and `DashboardSidebarStack` for supporting side content.
- Use `DashboardActionsRow` for clusters of page or section actions.
- Keep dashboard spacing consistent with the shared page rhythm: section gaps at `gap-6` to `gap-8`, action gaps at `gap-2.5`.

### Lists

- Use `DashboardToolbar` for search, filters, result counts, and clear actions.
- Keep filters in the toolbar on desktop and in a `Sheet` on mobile.
- Wrap desktop tables in `DashboardTableContainer`.
- For mobile list views, keep the same content hierarchy and token usage as the desktop table shell.

### Auth and Public Surfaces

- Auth, marketing, and public pages still use the same semantic color and surface system.
- Reuse existing shared classes such as `hero-panel`, `section-panel`, `soft-panel`, `eyebrow`, and `meta-label`.
- Avoid one-off gradients, shadows, radii, or raw palette utilities unless they are promoted into shared tokens or classes first.

## Do's and Don'ts

### Do

- Use semantic tokens and shared utility classes.
- Reuse `components/ui/*` and `components/shared/*` before creating custom markup.
- Prefer `gap-*` for spacing and shared wrappers for layout.
- Keep variants and sizes aligned with the documented names.
- Preserve focus states, contrast, and accessible labels.
- Use inline `style` only for structural CSS variable plumbing, not visual styling.

### Don't

- Do not use inline visual styles for colors, shadows, radii, spacing, or typography.
- Do not apply raw palette utilities like `text-emerald-*` or `bg-amber-*` in feature code.
- Do not bypass `Field*`, `Card*`, `Dialog*`, `Sheet*`, or table composition when a shared pattern exists.
- Do not use `space-y-*` or `space-x-*` for new layout work.
- Do not introduce new visual variants casually or restyle primitives page by page.

## Example Snippets

### Primary Button With Loading State

```tsx
<Button disabled={isSaving} type="submit">
  {isSaving ? <Spinner aria-hidden="true" /> : null}
  Save changes
</Button>
```

### Standard Form Section

```tsx
const nameError = "";

<FormSection
  title="Business details"
  description="Use the same naming and contact details customers will see."
>
  <FieldGroup>
    <Field data-invalid={Boolean(nameError)}>
      <FieldLabel htmlFor="business-name">Business name</FieldLabel>
      <FieldContent>
        <Input id="business-name" aria-invalid={Boolean(nameError)} />
      </FieldContent>
      <FieldError>{nameError}</FieldError>
    </Field>
  </FieldGroup>

  <FormActions>
    <Button variant="outline" type="button">
      Cancel
    </Button>
    <Button type="submit">Save</Button>
  </FormActions>
</FormSection>
```

### Standard Dashboard List Section

```tsx
<DashboardPage>
  <PageHeader
    eyebrow="Inquiries"
    title="Customer requests"
    description="Review, filter, and follow up from one place."
  />

  <DataListToolbar
    description="Search by customer, request, or form."
    resultLabel={`${count} results`}
    {...toolbarProps}
  />

  <DashboardTableContainer>
    <Table>{/* rows */}</Table>
  </DashboardTableContainer>
</DashboardPage>
```

## Cleanup Targets

- Replace remaining `space-y-*` and `space-x-*` stacks with `flex`/`grid` plus `gap-*`.
- Replace raw status color utilities with centralized badge, alert, or shared status patterns.
- Reduce repeated arbitrary radii, shadows, and hard-coded visual values by promoting reusable classes or tokens when a pattern repeats.
