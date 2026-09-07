# ADR 008: Panel Padding Lives in the Shared Utilities

**Status**: Accepted
**Date**: 2026-09-06
**Deciders**: Implementation team
**Context**: `docs/specs/dashboard-density-and-scale.md`

---

## Context

The shared panel utilities (`section-panel`, `soft-panel`) carried no padding
of their own, so every surface using them re-declared padding independently —
74 call sites, no two obliged to agree, and no single value to change when the
product's density needed adjusting. The already-padded tile utility
(`info-tile`, `px-4 py-4`) showed the alternative: padding baked into the
shared class, one value to change.

## Decision

Bake padding into the shared elevated and soft panel utilities so they behave
like the tile utility, and delete the corresponding padding from every
surface that uses them:

- `.section-panel` carries `px-4 py-4 sm:px-5 sm:py-5`.
- `.soft-panel` carries `px-4 py-4`.

Surfaces that legitimately supply their own padding (full-bleed card
headers, floating bars, tighter option rows, document previews, and every
out-of-scope surface — marketing, auth, public, print/PDF) opt out with the
documented `data-padding="none"` attribute:

```css
.section-panel:not([data-padding="none"]) { @apply px-4 py-4 sm:px-5 sm:py-5; }
.soft-panel:not([data-padding="none"]) { @apply px-4 py-4; }
```

## Rationale

1. **One value to change.** Density becomes a property of the shared layer,
   adjustable without editing dozens of surfaces.
2. **No silent disagreement.** A call-site padding utility on the same class
   attribute as a padded panel is silently ignored by the cascade (see below),
   so keeping both invites mystery spacing. The density audit
   (`scripts/audit-density.ts`) fails on exactly that combination.
3. **Documented escape hatch.** The opt-out keeps legitimate exceptions
   explicit and greppable instead of scattering competing declarations.

### The cascade trade-off

A compiled cascade probe confirmed that Tailwind's atomic utilities and the
project's custom utility classes land in the same cascade layer at identical
specificity, with the custom classes emitted later in source order — so a
class-level padding declaration wins over a call-site padding utility, and
call-site padding stops working silently. Guarding the baked declaration
behind a negated attribute selector restores the escape hatch: with
`data-padding="none"` present, the baked rule does not apply and the
call-site (or zero) padding takes effect as written.

## Consequences

- Positive: panel rhythm is consistent across the dashboard, settings, and
  admin console; future density adjustments touch two declarations.
- Positive: the density audit makes regressions fail loudly in `npm run check`.
- Negative: authors must learn the opt-out for full-bleed headers, floating
  bars, tighter rows, and document previews. This is recorded here and in
  `DESIGN.md` so the next person who finds their padding ignored treats it
  as a mechanism, not a bug.
- Negative: out-of-scope surfaces (marketing, auth, public, print/PDF) each
  carry an explicit opt-out so the baked scale never leaks into them.

## Alternatives considered

- **Keep padding at call sites and document a convention.** Rejected: 74
  surfaces already proved a convention does not hold without enforcement.
- **A density token layer or per-user comfortable/compact preference.**
  Rejected: the complaint is that one scale is wrong, not that a choice is
  missing. No indirection between a primitive and its size.
