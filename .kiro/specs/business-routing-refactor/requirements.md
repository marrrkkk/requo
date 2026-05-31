# Requirements Document

## Introduction

This spec covers a routing and navigation refactor for the Requo/QuoteFlow Next.js SaaS app. The goal is to promote the business slug to a top-level route segment (removing the `/businesses` prefix), introduce an Attio-style business switcher dropdown, create a dedicated "New Business" page, and consolidate all settings (personal and business) under a unified settings area with a dedicated sidebar.

## Glossary

- **App**: The Requo Next.js application
- **Router**: The Next.js App Router responsible for URL-to-page resolution
- **Business_Slug**: A URL-safe unique identifier for a business (e.g. `acme-plumbing`)
- **Business_Switcher**: A dropdown menu in the sidebar header allowing users to switch between businesses and access key actions
- **Settings_Sidebar**: A dedicated navigation panel within the settings area containing grouped links for personal and business settings
- **Sidebar**: The primary left-hand navigation panel visible within a business context
- **Hub_Page**: The landing page listing all businesses a user belongs to (currently `/businesses`)
- **Onboarding_Flow**: The existing guided setup experience for new users creating their first business

## Requirements

### Requirement 1: Top-level Business Slug Routing

**User Story:** As a user, I want my business URL to be shorter and cleaner (e.g. `/acme/dashboard` instead of `/businesses/acme/dashboard`), so that URLs are easier to share and type.

#### Acceptance Criteria

1. WHEN a user navigates to a business-scoped page, THE Router SHALL resolve the route using the pattern `/[businessSlug]/...` instead of `/businesses/[slug]/...`
2. THE Router SHALL preserve all existing sub-routes (dashboard, inquiries, quotes, follow-ups, analytics, settings, members, forms, knowledge, assistant, jobs, invoices) under the new `/[businessSlug]/` prefix
3. WHEN a user visits a legacy `/businesses/[slug]/...` URL, THE Router SHALL redirect to the equivalent `/[businessSlug]/...` URL with a 308 permanent redirect
4. THE App SHALL retain the Hub_Page for listing all businesses, accessible at the `/businesses` path
5. THE Router SHALL treat the following top-level path segments as reserved routes that take priority over Business_Slug resolution: auth routes, marketing routes, onboarding, admin, api, invite, account, verify-email, businesses, quote, and inquire
6. IF a route segment matches both a reserved path and a valid Business_Slug, THEN THE Router SHALL resolve the route to the reserved path and return the reserved page content
7. IF a user navigates to `/[segment]/...` where the segment is not a reserved path and does not match any existing Business_Slug in the database, THEN THE Router SHALL return a 404 Not Found response within 3 seconds
8. WHEN a Business_Slug is created or updated, THE System SHALL validate that the slug does not collide with any reserved top-level path segment, rejecting the operation with an error message indicating the slug is unavailable if a collision is detected

### Requirement 2: Business Switcher Dropdown

**User Story:** As a user managing multiple businesses, I want a business switcher in the sidebar that also provides quick access to settings and account actions, so that I can navigate efficiently without hunting through menus.

#### Acceptance Criteria

1. THE Business_Switcher SHALL display the currently active business name and logo in the Sidebar header area, where the logo is rendered as the business avatar (falling back to initials when no logo is uploaded) and the business name is truncated with an ellipsis if it exceeds the available width
2. WHEN the user opens the Business_Switcher, THE Business_Switcher SHALL display a dropdown listing all businesses the user belongs to (up to a maximum of 50 businesses), with each entry showing the business name, slug, and member role, and the currently active business indicated by a checkmark icon
3. WHEN the user selects a different business from the Business_Switcher list, THE App SHALL navigate to that business's dashboard within 300ms of selection
4. IF the selected business has a "locked" record state, THEN THE Business_Switcher SHALL display a "Locked" badge next to that business entry in the list
5. THE Business_Switcher SHALL include a "New business" action that navigates to the business creation page accessible from the businesses hub
6. THE Business_Switcher SHALL include an "Account settings" action that navigates to the personal account settings area at the account path
7. THE Business_Switcher SHALL include a "Business settings" action that navigates to the current business's settings area scoped to the active business slug
8. THE Business_Switcher SHALL include an "Invite team members" action that navigates to the current business's members page scoped to the active business slug
9. THE Business_Switcher SHALL include a "Sign out" action that ends the user's authenticated session and redirects to the login page
10. WHEN the Business_Switcher is open on a mobile viewport (below the sidebar breakpoint), THE Business_Switcher SHALL close the mobile sidebar overlay after the user selects any navigation action
11. WHEN the Business_Switcher is introduced, THE Sidebar SHALL no longer display standalone settings navigation links that duplicate the switcher actions

### Requirement 3: New Business Creation Page

**User Story:** As an existing user, I want a dedicated page for creating an additional business, so that I can set up a new workspace without going through the full onboarding flow.

#### Acceptance Criteria

1. THE App SHALL provide a dedicated page for creating a new business, accessible via a navigation link from the Business_Switcher component and a creation entry point on the Hub_Page.
2. THE new business page SHALL include a business name input (2 to 80 characters), a default currency selector from the supported currencies list, and a starter template selector from the available starter template options.
3. THE new business page SHALL NOT include personal profile setup steps (name, avatar, or account preferences) that belong to the Onboarding_Flow.
4. WHEN the user successfully creates a business, THE App SHALL navigate to the new business's dashboard page within 3 seconds of form submission.
5. IF the user's plan quota does not allow additional businesses, THEN THE App SHALL display an upgrade prompt showing the current plan limit, the number of businesses already owned, and a path to upgrade, instead of the creation form.
6. IF the user submits the creation form with invalid input (name outside 2–80 characters, missing currency, or missing template selection), THEN THE App SHALL display inline field-level error messages indicating which fields failed validation without navigating away from the page.
7. WHEN the user submits the creation form with a valid business name, THE App SHALL auto-generate a unique URL slug derived from the business name and use it for the new business's workspace path.
8. IF business creation fails due to a server error or quota race condition, THEN THE App SHALL display an error message indicating the business could not be created and preserve the user's form input.

### Requirement 4: Unified Settings Area

**User Story:** As a user, I want all my settings (personal and business) in one place with clear organization, so that I do not have to remember whether a setting lives under "Account" or inside a business.

#### Acceptance Criteria

1. THE App SHALL provide a settings area at `/[businessSlug]/settings` with its own Settings_Sidebar
2. THE Settings_Sidebar SHALL contain a "Personal" section grouping user-level settings (Profile, Appearance, Notifications)
3. THE Settings_Sidebar SHALL contain a "Business" section grouping business-level settings (General, Members, Plans, Billing, Quote defaults, Email, Pricing, Knowledge, Integrations, Audit log)
4. WHEN the user navigates to `/[businessSlug]/settings` without a sub-path, THE App SHALL display the first item in the Personal section (Profile) by default
5. THE personal settings pages SHALL display the same content currently served by `/account/profile`, `/account/billing`, and `/account/security`
6. THE business settings pages SHALL display the same content currently served by `/businesses/[slug]/settings/...`
7. WHEN a user visits a legacy `/account/...` settings URL, THE Router SHALL issue a permanent (HTTP 308) redirect to the equivalent path under `/[businessSlug]/settings` using the user's most recently active business
8. IF the user has no most-recently-active business when visiting a legacy `/account/...` URL, THEN THE Router SHALL redirect to the equivalent path under `/[businessSlug]/settings` using the first business in alphabetical order by slug
9. THE Settings_Sidebar SHALL visually distinguish between the Personal and Business sections using group headings with visible labels
10. WHEN the user selects a settings item in the Settings_Sidebar, THE App SHALL highlight the active item and display the corresponding settings page within 300 milliseconds of navigation

### Requirement 5: Navigation Cleanup

**User Story:** As a user, I want a decluttered sidebar that focuses on my daily workflow, so that navigation is fast and free of items that belong in settings or the switcher.

#### Acceptance Criteria

1. WHEN the Business_Switcher and unified settings area are both rendered and functional, THE Sidebar SHALL remove any standalone "Settings" link previously shown in the main navigation list
2. THE Sidebar SHALL retain exactly these workflow-focused links in the main navigation list: Dashboard, Inquiries, Quotes, Follow-ups, Analytics, Forms, Jobs, Invoices, Assistant, Knowledge
3. WHEN the refactor is complete, THE App SHALL NOT expose duplicate paths to the same settings content through both the old sidebar location and the new unified settings area
4. IF a user navigates to a removed old settings path after the redirect grace period of 30 days from deployment, THEN THE App SHALL return a 404 response instead of rendering settings content
5. WHEN the sidebar is rendered, THE Sidebar SHALL display no more than 10 top-level workflow links visible without scrolling on a viewport height of 768px or greater
