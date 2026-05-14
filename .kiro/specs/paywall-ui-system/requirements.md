# Requirements Document

## Introduction

Requo currently uses inconsistent paywall patterns across the app — full-page blurs, random upgrade buttons, custom locked states, and ad-hoc popover notices. This feature replaces all of them with a unified, reusable paywall UI system built on the principle of "visible feature preview + locked premium action." Users should always understand what a paid feature does before upgrading. The system locks the premium action, not the entire page, and only blurs premium-generated outputs (analytics insights, AI suggestions, reports).

## Glossary

- **Paywall_System**: The unified set of reusable React components that present upgrade prompts, lock premium actions, preview paid features, and blur premium outputs across the Requo app.
- **UpgradePrompt**: A reusable component that displays inline upgrade messages in multiple layout variants (inline, card, banner, empty-state, modal) and sizes (sm, md, lg).
- **LockedAction**: A wrapper component that renders a visible but disabled button or action with a lock icon or plan badge, indicating the action requires an upgrade.
- **FeaturePreviewPaywall**: A component that renders the actual page layout or a safe preview state with example/demo data for paid feature pages, allowing users to understand the feature before upgrading.
- **PremiumContentBlur**: A component that applies a blur overlay exclusively to premium-generated outputs such as analytics insights, AI suggestions, and reports. It is not used for entire pages.
- **Plan_Badge**: A visual indicator showing which plan tier (Pro, Business) is required to unlock a feature or action.
- **Effective_Plan**: The resolved plan tier for a user's account, determined by `getEffectivePlan()` in the subscription service, accounting for subscription status, cancellation dates, and grace periods.
- **Feature_Entitlement**: A boolean access check resolved through `hasFeatureAccess()` in `lib/plans/entitlements.ts` that determines whether a plan grants access to a specific feature.
- **Usage_Limit**: A numeric cap on resource usage per plan tier, resolved through `getUsageLimit()` in `lib/plans/usage-limits.ts`.

## Requirements

### Requirement 1: UpgradePrompt Component

**User Story:** As a developer, I want a single reusable upgrade prompt component with multiple layout variants, so that I can present consistent upgrade messaging anywhere in the app without building custom UI each time.

#### Acceptance Criteria

1. THE Paywall_System SHALL provide an UpgradePrompt component that accepts a variant prop with values: inline, card, banner, empty-state, and modal.
2. THE UpgradePrompt SHALL accept a size prop with values sm, md, and lg, defaulting to md when not specified.
3. WHEN rendered, THE UpgradePrompt SHALL display a primary call-to-action button with the text "Upgrade to Pro" for users on the free plan and "Upgrade to Business" for users on the pro plan.
4. IF the user is on the business plan, THEN THE UpgradePrompt SHALL not render any output.
5. THE UpgradePrompt SHALL accept a description prop containing text that communicates the benefit the user gains by upgrading, and SHALL display this text as secondary content below or beside the call-to-action.
6. WHERE a Plan_Badge is specified, THE UpgradePrompt SHALL display the required plan tier badge (Pro or Business) alongside the upgrade message.
7. THE UpgradePrompt SHALL use the existing design system tokens (surface-*, control-*, overlay-*), rounded cards, and the border and muted background tokens defined in DESIGN.md.
8. THE UpgradePrompt SHALL render without content overflow or overlapping elements at viewport widths from 320px to 1440px.
9. WHEN the primary call-to-action is activated, THE UpgradePrompt SHALL trigger the existing checkout flow through the UpgradeButton component.
10. WHEN the inline variant is rendered, THE UpgradePrompt SHALL display the call-to-action and description without a card wrapper. WHEN the card variant is rendered, THE UpgradePrompt SHALL wrap content in a Card component. WHEN the banner variant is rendered, THE UpgradePrompt SHALL display as a full-width horizontal strip. WHEN the empty-state variant is rendered, THE UpgradePrompt SHALL display as a centered vertical layout suitable for replacing empty content areas. WHEN the modal variant is rendered, THE UpgradePrompt SHALL display within a Dialog overlay.

### Requirement 2: LockedAction Component

**User Story:** As a user on a free plan, I want to see premium action buttons in their real position with a clear locked indicator, so that I understand what the action does and why I need to upgrade.

#### Acceptance Criteria

1. THE Paywall_System SHALL provide a LockedAction wrapper component that renders the wrapped button or action in its natural position within the page layout.
2. IF a user lacks the required Feature_Entitlement, THEN THE LockedAction SHALL render the wrapped action as visually disabled with reduced opacity, a lock icon appended to the button label, and the Plan_Badge overlay indicating the required plan tier.
3. IF a user lacks the required Feature_Entitlement, THEN THE LockedAction SHALL set `aria-disabled="true"` on the wrapped action and prevent the default action from executing.
4. IF a user has the required Feature_Entitlement, THEN THE LockedAction SHALL render the wrapped action in its normal interactive state without any lock icon, Plan_Badge, or disabled attributes.
5. WHEN a locked action is activated by a user without the required entitlement, THE LockedAction SHALL display an upgrade popover containing the required plan name, a value description of the locked feature, and a call-to-action that triggers the existing checkout flow.
6. THE LockedAction SHALL accept a feature prop corresponding to a PlanFeature identifier from the entitlements system.
7. THE LockedAction SHALL accept an optional description prop that is displayed as the value explanation text within the upgrade popover when the locked action is activated.
8. IF no description prop is provided, THEN THE LockedAction SHALL fall back to the default value description from the planFeatureDescriptions map for the given PlanFeature.
9. THE LockedAction SHALL preserve the original button styling, size, and position so that no layout shift occurs between locked and unlocked states.

### Requirement 3: FeaturePreviewPaywall Component

**User Story:** As a user on a free plan, I want to see the actual page layout of a premium feature with example or demo data, so that I understand what the feature provides before deciding to upgrade.

#### Acceptance Criteria

1. THE Paywall_System SHALL provide a FeaturePreviewPaywall component that accepts a feature identifier (PlanFeature), the current business plan (BusinessPlan), a previewContent prop or render slot for example data, and children representing the unlocked content.
2. IF a user lacks the required Feature_Entitlement, THEN THE FeaturePreviewPaywall SHALL render the page structure using the provided previewContent, with a visible non-interactive indicator (such as a badge or banner) labeling the displayed data as example or demo content.
3. IF a user lacks the required Feature_Entitlement, THEN THE FeaturePreviewPaywall SHALL display an UpgradePrompt inline within the page layout showing the feature description and the name of the required plan.
4. WHEN a user has the required Feature_Entitlement, THE FeaturePreviewPaywall SHALL render the children content normally without any paywall indicators, demo labels, or upgrade prompts.
5. THE FeaturePreviewPaywall SHALL NOT hide the entire page behind a full-page blur or opaque overlay.
6. IF the previewContent prop is not provided and the user lacks the required Feature_Entitlement, THEN THE FeaturePreviewPaywall SHALL fall back to rendering an empty-state layout with the feature description and upgrade prompt instead of an empty or broken layout.
7. THE FeaturePreviewPaywall SHALL render responsively and maintain the same page structure across viewports from 320px to 1440px width, following the project's Tailwind responsive breakpoints.

### Requirement 4: PremiumContentBlur Component

**User Story:** As a product owner, I want to blur only premium-generated outputs (analytics insights, AI suggestions, reports) while keeping the surrounding page visible, so that users understand the feature context without accessing paid data.

#### Acceptance Criteria

1. THE Paywall_System SHALL provide a PremiumContentBlur component that applies a visual blur overlay exclusively to its children content.
2. WHEN a user lacks the required Feature_Entitlement, THE PremiumContentBlur SHALL render placeholder content with a blur effect and a centered upgrade prompt overlay. The actual premium data SHALL NOT be rendered in the DOM.
3. WHEN a user has the required Feature_Entitlement, THE PremiumContentBlur SHALL render its children normally without any blur or overlay.
4. THE PremiumContentBlur SHALL NOT be used to blur entire pages or full route layouts.
5. THE PremiumContentBlur SHALL prevent pointer interaction with the blurred placeholder content so that it cannot be selected or copied.
6. THE PremiumContentBlur SHALL ensure that the blurred placeholder content is marked with `aria-hidden="true"` so it is not accessible to screen readers.
7. THE PremiumContentBlur SHALL accept a feature prop corresponding to a PlanFeature identifier for access resolution.

### Requirement 5: Consistent Visual Language

**User Story:** As a user, I want all upgrade prompts and locked states across the app to look and feel the same, so that I always recognize when something requires an upgrade and trust the experience.

#### Acceptance Criteria

1. THE Paywall_System SHALL render all paywall components using the shared component definitions from the paywall module, applying rounded-xl border radius, borders using border-border/70, card backgrounds using bg-card/50 or bg-background/75, and Button components for call-to-action controls.
2. THE Paywall_System SHALL use "Upgrade to Pro" as the primary CTA text for free-plan users and "Upgrade to Business" for pro-plan users across all paywall components.
3. THE Paywall_System SHALL display secondary text on all upgrade prompts that states what capability the user gains upon upgrading rather than only stating the feature is locked or unavailable.
4. THE Paywall_System SHALL use only the existing shadcn/ui primitives (Card, Badge, Button, Dialog) and Tailwind CSS v4 semantic tokens (surface-*, control-*, border-*, muted-*) defined in DESIGN.md without introducing custom color utilities, new component variants, or inline visual styles for colors, shadows, or radii.
5. IF the user's current plan is "business" (the highest tier), THEN THE Paywall_System SHALL not display any upgrade prompts or locked-state indicators for that user.
6. THE Paywall_System SHALL display a Plan_Badge (using the existing Badge component with the required plan's label — "Pro" or "Business") on each locked action and upgrade prompt to communicate which specific plan tier unlocks the feature.

### Requirement 6: Feature-Specific Paywall Application

**User Story:** As a product owner, I want each existing paywall in the app replaced with the appropriate reusable paywall component, so that the user experience is consistent and users can always preview what they are upgrading for.

#### Acceptance Criteria

1. WHEN a free-plan user visits the Follow-ups page, THE Paywall_System SHALL show the follow-ups list and existing follow-up data normally and lock the "Create follow-up" action using LockedAction with the relevant Feature_Entitlement check.
2. WHEN a free-plan user visits the Team Members settings page, THE Paywall_System SHALL show the members list normally and lock the "Invite member" action using LockedAction gated by the "members" Feature_Entitlement.
3. WHEN a free-plan user visits the Analytics page, THE Paywall_System SHALL show the page layout with empty or summary-level panels normally and blur the conversion analytics and workflow analytics insight panels using PremiumContentBlur gated by the "analyticsConversion" and "analyticsWorkflow" Feature_Entitlements respectively.
4. WHEN a user has exhausted their AI usage quota as determined by the applicable Usage_Limit, THE Paywall_System SHALL show the AI feature interface normally and lock the generate action using LockedAction with a description indicating the usage limit has been reached and the required plan to increase it.
5. WHEN a user exceeds their "businessesPerPlan" Usage_Limit, THE Paywall_System SHALL show the businesses list normally and display an UpgradePrompt (banner variant) indicating the current limit and the plan required to add more businesses.
6. WHEN a free-plan user visits branding or inquiry page customization settings, THE Paywall_System SHALL show the settings page normally and lock controls gated by the "branding" Feature_Entitlement and the "inquiryPageCustomization" Feature_Entitlement using LockedAction with Plan_Badge indicators showing "Pro".
7. WHEN a free-plan user visits the form builder, THE Paywall_System SHALL show the basic form builder normally and lock the ability to add fields beyond the "customFieldsPerForm" Usage_Limit and the ability to create forms beyond the "liveFormsPerBusiness" Usage_Limit using LockedAction.

### Requirement 7: Access Control and Data Security

**User Story:** As a product owner, I want the paywall UI system to work with the existing billing infrastructure without exposing premium data to unauthorized users, so that the system remains secure while improving the user experience.

#### Acceptance Criteria

1. THE Paywall_System SHALL resolve plan access through the existing `hasFeatureAccess()` function in `lib/plans/entitlements.ts` and `getUsageLimit()` in `lib/plans/usage-limits.ts`.
2. THE Paywall_System SHALL NOT expose premium-only data (analytics results, AI-generated content, advanced reports) to users who lack the required Feature_Entitlement.
3. WHEN premium data is displayed in a preview state, THE Paywall_System SHALL use only static placeholder data that is hardcoded in the component and does not originate from real user, business, or account records.
4. THE Paywall_System SHALL NOT bypass or duplicate the existing subscription service or billing infrastructure in `lib/billing/`.
5. IF a user's plan changes during an active session, THEN THE Paywall_System SHALL reflect the updated plan state on the next page navigation or data fetch without requiring a full page reload.
6. IF a server-side premium data endpoint receives a request from a user who lacks the required Feature_Entitlement, THEN THE Paywall_System SHALL deny the request and return an error response indicating insufficient plan access, without including any premium data in the response body.
7. THE Paywall_System SHALL enforce access control on the server side for all endpoints that return Feature_Entitlement-gated data, regardless of whether the client-side paywall component is rendered.
8. IF the entitlement check (`hasFeatureAccess()` or `getEffectivePlan()`) fails due to a service error, THEN THE Paywall_System SHALL deny access to the requested premium data rather than granting access by default.

### Requirement 8: Responsive and Accessible Design

**User Story:** As a user on a mobile device, I want paywall components to adapt to my screen size and remain usable with assistive technologies, so that I can understand and interact with upgrade prompts on any device.

#### Acceptance Criteria

1. THE Paywall_System SHALL render all paywall components responsively across viewport widths from 320px to 1440px without horizontal scrollbar, content overflow beyond the viewport edge, or interactive elements overlapping each other.
2. WHILE the viewport width is below 768px, THE Paywall_System SHALL ensure all interactive elements (buttons, links, dismissible prompts) meet a minimum touch target size of 44x44 CSS pixels.
3. THE Paywall_System SHALL assign `role="region"` with an `aria-label` describing the locked feature name and required plan to each locked-state container, and SHALL mark decorative lock icons and blurred preview content as `aria-hidden="true"`.
4. THE Paywall_System SHALL ensure sufficient color contrast ratios (minimum 4.5:1 for text, 3:1 for interactive element boundaries and icons) for all paywall component text and indicators against their rendered background.
5. THE Paywall_System SHALL support keyboard navigation such that all interactive paywall elements are reachable via Tab key in DOM order, activatable via Enter or Space key, and dismissible (for modals and popovers) via the Escape key.
6. WHEN the modal variant of UpgradePrompt is displayed, THE Paywall_System SHALL trap focus within the modal and return focus to the triggering element on dismissal.
7. WHEN a user has enabled a reduced-motion preference at the OS level, THE Paywall_System SHALL disable or replace transition animations in paywall components with instant state changes.

### Requirement 9: Migration of Existing Paywalls

**User Story:** As a developer, I want a clear migration path from the existing inconsistent paywall components to the new unified system, so that I can incrementally replace old patterns without breaking existing functionality.

#### Acceptance Criteria

1. THE Paywall_System SHALL replace the existing `LockedFeatureOverlay` component usage with PremiumContentBlur where the overlay wraps premium-generated output (e.g., AI drafts, analytics charts), or FeaturePreviewPaywall where the overlay wraps a navigable page section with static content visible to free users.
2. THE Paywall_System SHALL replace the existing `LockedFeaturePage` component usage with FeaturePreviewPaywall where the route renders at least one meaningful content element visible without the premium feature, or UpgradePrompt (empty-state variant) where the route has no renderable content without the premium feature.
3. THE Paywall_System SHALL replace the existing `LockedFeatureCard` component usage with UpgradePrompt (card variant).
4. THE Paywall_System SHALL replace the existing `ProFeatureNoticeButton` component usage with LockedAction.
5. WHEN all component replacements for a route are complete, THE Paywall_System SHALL ensure that no full-page blur overlay remains on that route unless the entire route content is premium-generated output with no static or structural elements visible to free-plan users.
6. THE Paywall_System SHALL preserve the existing `UsageLimitBanner` component's public props (`label`, `current`, `limit`, `plan`) and rendering behavior (progress bar, at-limit messaging) while applying the unified visual language (spacing, border tokens, typography) defined by the new paywall system.
7. WHILE migration is in progress, THE Paywall_System SHALL allow old paywall components and new unified components to coexist on separate routes without style conflicts or runtime errors, so that replacement can proceed one route at a time.
