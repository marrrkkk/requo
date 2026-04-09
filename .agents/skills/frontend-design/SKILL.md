---
name: frontend-design
description: Create production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples include websites, landing pages, dashboards, React components, HTML/CSS layouts, or when styling or beautifying any web UI). When the repo already has a design system or a `DESIGN.md`, preserve that system instead of inventing a new visual language.
license: Complete terms in LICENSE.txt
---

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

## Repo Override

If the current repository already has a canonical design system or repo-local UI guide, read it first and treat it as higher priority than the stylistic guidance below.

In Requo:

- Read `../../../DESIGN.md` and `../requo-repo-guide/SKILL.md` before coding.
- Preserve the existing calm, minimalist, production SaaS language.
- Reuse existing semantic tokens, shared wrappers, and shadcn primitives.
- Do not chase bold, unforgettable, maximalist, or highly differentiated aesthetics in this repo.
- Use creativity inside the current system through hierarchy, spacing, and composition, not through a new visual direction.

The user provides frontend requirements: a component, page, application, or interface to build. They may include context about the purpose, audience, or technical constraints.

## Design Thinking

Before coding, understand the context and commit to a clear aesthetic direction:

- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Choose a direction that fits the product and the repository's existing visual language.
- **Constraints**: Technical requirements, performance, accessibility, and system consistency.
- **Differentiation**: Decide what should feel intentional and well-designed without breaking the established product language.

Then implement working code (HTML/CSS/JS, React, Vue, etc.) that is:

- Production-grade and functional
- Cohesive with a clear point of view
- Meticulously refined in spacing, hierarchy, and composition
- Consistent with the surrounding product

## Frontend Aesthetics Guidelines

Focus on:

- **Typography**: Use the repo's established type system and font setup when one exists.
- **Color and theme**: Prefer semantic tokens and CSS variables over raw palette choices.
- **Motion**: Use animation only where it improves clarity, feedback, or polish.
- **Spatial composition**: Use strong hierarchy, spacing, and layout rhythm.
- **Backgrounds and details**: Build atmosphere through the existing system first, not through one-off effects.

NEVER use generic AI-generated aesthetics like overused layouts, arbitrary gradients, or stylistic choices that ignore the product context.

Interpret creatively, but match implementation complexity to the actual product. High-craft work should still feel intentional, maintainable, and compatible with the surrounding UI.
