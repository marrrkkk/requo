---
name: animate
description: Review a feature and enhance it with purposeful, accessible motion that improves usability and feedback. Use when the user mentions adding animation, transitions, micro-interactions, motion design, hover effects, or making the UI feel more alive, while respecting the repo's existing design and motion system.
user-invocable: true
argument-hint: "[target]"
---

Analyze a feature and strategically add animations and micro-interactions that enhance understanding, provide feedback, and polish.

## Repo Override

If the repo already has design or motion guidance, read it first and treat it as higher priority than the suggestions below.

In Requo:

- Read `../../../DESIGN.md`, `../../../app/globals.css`, and `../requo-repo-guide/SKILL.md` before changing motion.
- Use the existing motion tokens and `motion-*` utilities before adding new animation patterns.
- Keep motion subtle and functional. Favor feedback, disclosure, and panel transitions over spectacle.
- Do not add flashy hero animation, confetti, parallax, or decorative motion unless the feature already establishes that pattern.

## Mandatory Preparation

Open `/frontend-design` and the repo-specific design guidance first. Gather performance constraints and confirm whether reduced-motion behavior already exists before changing animation.

## Assess Animation Opportunities

Analyze where motion would improve the experience:

1. **Identify static areas**:
   - **Missing feedback**: Actions without visual acknowledgment
   - **Jarring transitions**: Instant state changes that feel abrupt
   - **Unclear relationships**: Spatial or hierarchical relationships that are hard to read
   - **Missed guidance**: Opportunities to direct attention or explain behavior

2. **Understand the context**:
   - What's the product personality?
   - What's the performance budget?
   - Who's the audience?
   - What matters most: a single key transition or several small feedback moments?

If any of these are unclear from the codebase, ask the user directly to clarify what you cannot infer.

**CRITICAL**: Respect `prefers-reduced-motion`. Always provide non-animated alternatives for users who need them.

## Plan Animation Strategy

Create a purposeful animation plan:

- **Hero moment**: What's the one signature animation, if any?
- **Feedback layer**: Which interactions need acknowledgment?
- **Transition layer**: Which state changes need smoothing?
- **Delight layer**: Where does subtle emphasis help, if the product tone allows it?

One well-orchestrated experience beats scattered animation everywhere. It is valid to decide a feature only needs a few restrained transitions.

## Implement Animations

Add motion systematically across these categories:

### Entrance Animations

- **Page load choreography**: Stagger element reveals only when it helps readability
- **Hero section**: Reserve larger entrances for marketing or public surfaces when they match the product tone
- **Content reveals**: Use scroll-triggered animation sparingly
- **Modal or drawer entry**: Use smooth slide and fade transitions with focus management

### Micro-Interactions

- **Button feedback**:
  - Hover: Subtle lift, color shift, or shadow increase
  - Click: Quick press feedback
  - Loading: Keep the label visible and show a spinner or subtle pulse
- **Form interactions**:
  - Input focus: Border, ring, or background transition
  - Validation: Clear transitions for error and success states
- **Toggle switches**: Smooth slide and color transition

### State Transitions

- **Show or hide**: Fade and slide instead of instant jumps
- **Expand or collapse**: Height or disclosure transitions with overflow handling
- **Loading states**: Skeleton fades, spinner animation, or soft progress cues
- **Enable or disable**: Opacity and emphasis transitions

### Navigation And Flow

- **Page transitions**: Use only when the product shell supports them
- **Tab switching**: Smooth indicator and content transitions
- **Scroll effects**: Keep them practical and lightweight

### Optional Product-Specific Moments

- **Empty states**: Gentle illustration or icon motion only if the product already uses it
- **Completed actions**: Subtle emphasis or confirmation, not celebration by default
- **Contextual motion**: Use only when it is already part of the product language

## Technical Implementation

Use appropriate techniques for each animation:

### Timing And Easing

**Durations by purpose:**

- **100-150ms**: Instant feedback
- **200-300ms**: State changes
- **300-500ms**: Layout changes
- **500-800ms**: Rare entrance sequences

**Easing curves:**

```css
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
--ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
```

Exit animations are faster than entrances. Use about 75% of the enter duration.

### CSS Animations

- Prefer transitions for state changes
- Use `@keyframes` for complex sequences
- Prefer `transform` and `opacity`

### JavaScript Animation

- Use the Web Animations API or a library only when CSS is not enough

### Performance

- Use GPU-friendly properties such as `transform` and `opacity`
- Add `will-change` sparingly
- Minimize paint and layout work
- Keep interaction responsive during transitions

### Accessibility

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Verify Quality

Test animations thoroughly:

- Smooth at 60fps on the target device class
- Appropriate timing and easing
- Reduced motion works
- Interactions stay responsive
- The animation adds clarity or polish instead of distraction
