# Implementation Plan: Paywall UI System

## Overview

Replace Requo's inconsistent paywall patterns with a unified, composable set of React components in `features/paywall/`. The implementation builds from shared utilities and types upward through four primary components (UpgradePrompt, LockedAction, FeaturePreviewPaywall, PremiumContentBlur), then migrates existing routes to use the new system. All components integrate with the existing entitlements infrastructure — no schema changes required.

## Tasks

- [x] 1. Set up paywall module structure and shared utilities
  - [x] 1.1 Create paywall module directory structure and barrel export
    - Create `features/paywall/components/`, `features/paywall/lib/`, and `features/paywall/index.ts`
    - Define shared TypeScript types: `UpgradePromptVariant`, `UpgradePromptSize`, `UpgradeActionProps`
    - Export all public types and components from the barrel
    - _Requirements: 1.1, 1.2, 7.1_

  - [x] 1.2 Create placeholder data module
    - Create `features/paywall/lib/placeholder-data.ts` with static placeholder content per feature
    - Include realistic but clearly fake examples for analytics, AI suggestions, and reports
    - Ensure no real user/business/account data is referenced
    - _Requirements: 7.2, 7.3_

  - [x] 1.3 Create paywall utility helpers
    - Create `features/paywall/lib/utils.ts` with shared helpers (e.g., `getUpgradeDescription`, `resolveRequiredPlan`)
    - Implement fail-closed wrapper for entitlement checks that catches service errors and defaults to denied
    - _Requirements: 7.1, 7.8_

- [x] 2. Implement UpgradePrompt component
  - [x] 2.1 Implement UpgradePrompt with all five variants
    - Create `features/paywall/components/upgrade-prompt.tsx`
    - Implement `inline` variant: CTA + description in a flex row, no card wrapper
    - Implement `card` variant: wrapped in Card with CardHeader + CardContent
    - Implement `banner` variant: full-width horizontal strip with `rounded-xl border border-border/70 bg-card/50`
    - Implement `empty-state` variant: centered vertical layout with icon, description, and CTA
    - Implement `modal` variant: content rendered inside Dialog overlay
    - Return `null` when `plan === "business"`
    - CTA text: "Upgrade to Pro" for free, "Upgrade to Business" for pro
    - Accept `size` prop (sm, md, lg) defaulting to md
    - Integrate with existing `UpgradeButton` when `upgradeAction` is provided; fall back to billing page link when omitted
    - Use existing shadcn/ui primitives (Card, Badge, Button, Dialog) and Tailwind v4 semantic tokens
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.9, 1.10, 5.1, 5.2, 5.3, 5.4_

  - [ ]* 2.2 Write property tests for UpgradePrompt
    - **Property 1: Variant-wrapper mapping** — verify each variant renders the correct wrapper element
    - **Property 2: Description passthrough** — verify description string appears as visible text
    - **Property 11: Business plan suppresses all paywall UI** — verify null output for business plan
    - **Validates: Requirements 1.10, 1.5, 1.4, 5.5**

  - [ ]* 2.3 Write unit tests for UpgradePrompt
    - Test size default (md when not specified)
    - Test CTA text mapping (free → "Upgrade to Pro", pro → "Upgrade to Business")
    - Test returns null for business plan
    - Test responsive rendering without overflow at 320px–1440px
    - Test Plan_Badge display when `showBadge` is true
    - _Requirements: 1.2, 1.3, 1.4, 1.6, 1.8_

- [x] 3. Implement LockedAction component
  - [x] 3.1 Implement LockedAction wrapper component
    - Create `features/paywall/components/locked-action.tsx`
    - When `hasFeatureAccess(plan, feature)` is true: render children normally (passthrough)
    - When locked: render children with `opacity-50`, lock icon appended, Plan_Badge overlay
    - Set `aria-disabled="true"` on wrapped element when locked
    - Intercept click → show upgrade Popover with plan name, description, and CTA
    - Fall back to `planFeatureDescriptions[feature]` when no description prop provided
    - Preserve original button styling, size, and position (no layout shift)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

  - [ ]* 3.2 Write property tests for LockedAction
    - **Property 3: LockedAction locked state rendering** — verify disabled state, lock icon, badge, click prevention
    - **Property 4: LockedAction unlocked passthrough** — verify normal rendering without lock indicators
    - **Property 5: LockedAction default description fallback** — verify planFeatureDescriptions fallback
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.8**

  - [ ]* 3.3 Write unit tests for LockedAction
    - Test popover appears on click when locked
    - Test keyboard navigation (Tab, Enter, Space, Escape)
    - Test no layout shift between locked/unlocked states
    - _Requirements: 2.5, 2.9, 8.5_

- [x] 4. Implement FeaturePreviewPaywall component
  - [x] 4.1 Implement FeaturePreviewPaywall component
    - Create `features/paywall/components/feature-preview-paywall.tsx`
    - When `hasFeatureAccess(plan, feature)` is true: render children normally
    - When locked + previewContent provided: render preview with "Demo data" badge + inline UpgradePrompt (banner variant)
    - When locked + no previewContent: render UpgradePrompt (empty-state variant) with feature description
    - Never apply full-page blur or opaque overlay
    - Render responsively across 320px–1440px viewports
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ]* 4.2 Write property tests for FeaturePreviewPaywall
    - **Property 6: FeaturePreviewPaywall locked state** — verify preview content + demo indicator + UpgradePrompt
    - **Property 7: FeaturePreviewPaywall unlocked passthrough** — verify children render without paywall indicators
    - **Validates: Requirements 3.2, 3.3, 3.4**

- [x] 5. Implement PremiumContentBlur component
  - [x] 5.1 Implement PremiumContentBlur component
    - Create `features/paywall/components/premium-content-blur.tsx`
    - When `hasFeatureAccess(plan, feature)` is true: render children normally
    - When locked: render placeholder with `blur-[3px] pointer-events-none select-none aria-hidden="true"`
    - Overlay centered UpgradePrompt (inline variant) on top of blurred placeholder
    - **Do NOT render children in the DOM when locked** — premium data must not be accessible
    - Wrap in `role="region"` with `aria-label` describing the locked feature
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 5.2 Write property tests for PremiumContentBlur
    - **Property 8: PremiumContentBlur excludes premium data from DOM** — verify children not in DOM when locked
    - **Property 9: PremiumContentBlur unlocked passthrough** — verify normal rendering without blur
    - **Property 10: PremiumContentBlur accessibility in locked state** — verify pointer-events:none and aria-hidden
    - **Validates: Requirements 4.2, 4.3, 4.5, 4.6, 7.2**

- [x] 6. Checkpoint - Ensure all core components work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement accessibility and responsive behavior
  - [x] 7.1 Add ARIA attributes and keyboard navigation to all paywall components
    - Add `role="region"` with `aria-label` to locked-state containers
    - Mark decorative lock icons and blurred content with `aria-hidden="true"`
    - Ensure all interactive elements reachable via Tab, activatable via Enter/Space, dismissible via Escape
    - Implement focus trap in modal variant of UpgradePrompt
    - Return focus to triggering element on modal/popover dismissal
    - Ensure minimum 44x44px touch targets on mobile viewports (<768px)
    - Respect `prefers-reduced-motion` — disable/replace animations with instant state changes
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [ ]* 7.2 Write property tests for accessibility
    - **Property 12: Plan badge presence on locked states** — verify Badge with required plan label present
    - **Property 15: ARIA attributes on locked containers** — verify role="region", aria-label, aria-hidden on decorative elements
    - **Validates: Requirements 5.6, 8.3**

  - [ ]* 7.3 Write unit tests for accessibility and responsive behavior
    - Test focus trap in modal variant
    - Test keyboard dismissal (Escape key)
    - Test reduced-motion preference handling
    - Test color contrast compliance (4.5:1 text, 3:1 interactive boundaries)
    - _Requirements: 8.4, 8.5, 8.6, 8.7_

- [x] 8. Update UsageLimitBanner with unified visual language
  - [x] 8.1 Migrate UsageLimitBanner to paywall module with updated styling
    - Create `features/paywall/components/usage-limit-banner.tsx` based on existing component
    - Preserve existing public props (`label`, `current`, `limit`, `plan`) and rendering behavior
    - Apply unified visual language: spacing, border tokens (`border-border/70`), typography consistent with other paywall components
    - Re-export from `features/paywall/index.ts`
    - Keep existing `components/shared/paywall.tsx` UsageLimitBanner as deprecated re-export during migration
    - _Requirements: 9.6, 5.1_

- [x] 9. Implement fail-closed server-side access control pattern
  - [x] 9.1 Create server-side access control utility for premium endpoints
    - Create `features/paywall/lib/server-access.ts` with a reusable guard function
    - Wrap `hasFeatureAccess()` and `getEffectivePlanForUser()` calls in try/catch
    - On service error: deny access (return `plan="free"` equivalent) rather than granting
    - Log errors with context (userId, feature) without exposing details to client
    - Return appropriate error response (403) for unauthorized premium data requests
    - _Requirements: 7.6, 7.7, 7.8_

  - [ ]* 9.2 Write property tests for server-side access control
    - **Property 13: Server-side access denial for unauthorized requests** — verify error response without premium data
    - **Property 14: Fail-closed on entitlement service error** — verify access denied on service error
    - **Validates: Requirements 7.6, 7.7, 7.8**

- [x] 10. Checkpoint - Ensure all component tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Migrate existing routes to new paywall system
  - [x] 11.1 Migrate Follow-ups page paywall
    - Replace existing paywall pattern with LockedAction on "Create follow-up" button
    - Gate by relevant Feature_Entitlement check
    - Show follow-ups list normally, lock only the create action
    - _Requirements: 6.1, 9.4_

  - [x] 11.2 Migrate Team Members settings page paywall
    - Replace existing paywall pattern with LockedAction on "Invite member" button
    - Gate by "members" Feature_Entitlement
    - Show members list normally, lock only the invite action
    - _Requirements: 6.2, 9.4_

  - [x] 11.3 Migrate Analytics page paywall
    - Replace existing LockedFeatureOverlay with PremiumContentBlur on conversion and workflow analytics panels
    - Gate by "analyticsConversion" and "analyticsWorkflow" Feature_Entitlements respectively
    - Show page layout with empty/summary panels normally, blur only insight panels
    - _Requirements: 6.3, 9.1_

  - [x] 11.4 Migrate AI usage limit paywall
    - Replace existing pattern with LockedAction on generate action when AI usage quota exhausted
    - Show AI feature interface normally, lock only the generate action
    - Include description indicating usage limit reached and required plan
    - _Requirements: 6.4_

  - [x] 11.5 Migrate businesses list limit paywall
    - Replace existing pattern with UpgradePrompt (banner variant) when "businessesPerPlan" Usage_Limit exceeded
    - Show businesses list normally, display banner indicating limit and required plan
    - _Requirements: 6.5_

  - [x] 11.6 Migrate branding and inquiry page customization paywalls
    - Replace existing patterns with LockedAction on controls gated by "branding" and "inquiryPageCustomization" Feature_Entitlements
    - Show settings page normally, lock individual controls with Plan_Badge showing "Pro"
    - _Requirements: 6.6, 9.4_

  - [x] 11.7 Migrate form builder paywalls
    - Replace existing patterns with LockedAction for field additions beyond "customFieldsPerForm" Usage_Limit
    - Lock form creation beyond "liveFormsPerBusiness" Usage_Limit
    - Show basic form builder normally, lock only the gated actions
    - _Requirements: 6.7_

- [x] 12. Ensure migration coexistence and cleanup
  - [x] 12.1 Verify old and new components coexist without conflicts
    - Ensure deprecated components in `components/shared/paywall.tsx` still work on unmigrated routes
    - Verify no style conflicts or runtime errors between old and new systems
    - Add deprecation comments to old components pointing to new paywall module
    - Remove any full-page blur overlays on migrated routes (unless entire route content is premium-generated)
    - _Requirements: 9.5, 9.7_

  - [ ]* 12.2 Write integration tests for migrated routes
    - Test Follow-ups page: free user sees list, create action locked
    - Test Analytics page: free user sees layout, insight panels blurred with placeholder
    - Test Team Members page: free user sees list, invite action locked
    - Test plan change reflected on next navigation without full page reload
    - _Requirements: 6.1, 6.2, 6.3, 7.5_

- [x] 13. Wire business plan suppression across all components
  - [x] 13.1 Verify business plan suppression end-to-end
    - Ensure UpgradePrompt returns null for business plan
    - Ensure LockedAction passes through for business plan (all features accessible)
    - Ensure FeaturePreviewPaywall renders children for business plan
    - Ensure PremiumContentBlur renders children for business plan
    - Add integration test verifying no paywall UI renders for business-plan users
    - _Requirements: 5.5, 1.4_

  - [ ]* 13.2 Write property test for business plan suppression
    - **Property 11: Business plan suppresses all paywall UI** — verify across all four component types
    - **Validates: Requirements 5.5, 1.4**

- [x] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases using Vitest
- The design uses TypeScript throughout — all implementations use TypeScript with React 19
- No schema changes required — the system reads from existing plan/entitlements infrastructure
- Old paywall components (`LockedFeatureOverlay`, `LockedFeaturePage`, `LockedFeatureCard`, `ProFeatureNoticeButton`) remain functional during migration and are deprecated once all routes are migrated

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "8.1", "9.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "4.1"] },
    { "id": 4, "tasks": ["4.2", "5.1"] },
    { "id": 5, "tasks": ["5.2", "7.1", "9.2"] },
    { "id": 6, "tasks": ["7.2", "7.3"] },
    { "id": 7, "tasks": ["11.1", "11.2", "11.3", "11.4", "11.5", "11.6", "11.7"] },
    { "id": 8, "tasks": ["12.1", "13.1"] },
    { "id": 9, "tasks": ["12.2", "13.2"] }
  ]
}
```
