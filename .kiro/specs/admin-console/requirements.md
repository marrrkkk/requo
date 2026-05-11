# Requirements Document

## Introduction

The Admin Console is an internal operations surface that lets a trusted operator (initially, the product owner) oversee and support Requo users, businesses, and subscriptions. It lives at `/admin` on the main domain, sits behind Better Auth plus an environment-driven email allow-list, and records every view and action in the existing `admin_audit_logs` table.

Scope for v1:

- Read-only operations dashboard with high-level counts
- User oversight and support actions (force email verify, revoke sessions, suspend/unsuspend, hard delete)
- Business oversight (read-only)
- Account subscription oversight plus manual plan override and force-cancel
- Full user impersonation with a persistent banner and explicit stop
- Password re-confirmation gate before destructive actions
- Comprehensive audit logging of all admin views and actions

Out of scope for v1: additional admin roles, feature flag management, inquiry/quote moderation, webhook event replay, email resend tooling, analytics beyond landing counts.

## Glossary

- **Admin_Console**: The internal `/admin` route tree and its route handlers, queries, actions, and UI.
- **Admin_User**: A signed-in Better Auth user whose verified email is listed in the `ADMIN_EMAILS` environment allow-list.
- **Admin_Email_Allowlist**: The comma-separated list of case-insensitive email addresses in the `ADMIN_EMAILS` environment variable.
- **Target_User**: A Requo end-user whose record is being viewed or acted on from the Admin Console.
- **Target_Business**: A business record owned by a Target_User that is being viewed from the Admin Console.
- **Target_Subscription**: An `account_subscriptions` row owned by a Target_User that is being viewed or acted on.
- **Destructive_Action**: An Admin Console mutation that removes access, deletes data, or overrides billing state. Specifically: hard-delete user, suspend user, revoke all sessions, force email verify, manual plan override, force-cancel subscription, start impersonation.
- **Impersonation_Session**: A Better Auth session owned by the Target_User that was created by an Admin_User via the Admin Console, tagged with the originating Admin_User's id.
- **Audit_Log**: A row in the existing `admin_audit_logs` table recording an admin view or action.
- **Subscription_Service**: The existing `lib/billing/subscription-service.ts` write path that keeps `account_subscriptions` and `businesses.plan` in sync.
- **Password_Reconfirmation**: A fresh Better Auth credential check against the Admin_User's own password, valid only for the single action that requested it.

## Requirements

### Requirement 1: Admin access gating

**User Story:** As the product owner, I want `/admin` to be reachable only by approved accounts, so that no customer or attacker can discover or use the admin surface.

#### Acceptance Criteria

1. WHEN an unauthenticated request targets any `/admin` route, THE Admin_Console SHALL return a 404 Not Found response with no admin markup rendered.
2. WHEN an authenticated request targets any `/admin` route and the signed-in user's email is not in the Admin_Email_Allowlist, THE Admin_Console SHALL return a 404 Not Found response.
3. WHEN an authenticated request targets any `/admin` route and the signed-in user's email is in the Admin_Email_Allowlist but `emailVerified` is false, THE Admin_Console SHALL return a 404 Not Found response.
4. WHEN comparing a signed-in email against the Admin_Email_Allowlist, THE Admin_Console SHALL perform a case-insensitive comparison on trimmed values.
5. IF `ADMIN_EMAILS` is unset or empty, THEN THE Admin_Console SHALL treat every request as unauthorized and return a 404 Not Found response.
6. WHEN an Admin_Console server action, route handler, or query is invoked, THE Admin_Console SHALL re-verify Admin_User status server-side before any read or write.

### Requirement 2: Landing operations dashboard

**User Story:** As an Admin_User, I want a read-only landing view with operating counts, so that I can see platform activity at a glance.

#### Acceptance Criteria

1. WHEN an Admin_User visits `/admin`, THE Admin_Console SHALL display total user count, total business count, active subscription count grouped by plan, sign-ups in the last 7 days, inquiries created in the last 7 days, and quotes sent in the last 7 days.
2. WHEN the landing dashboard renders, THE Admin_Console SHALL display the count of active subscriptions whose status is `active`, grouped by `plan`.
3. THE Admin_Console SHALL serve landing dashboard counts from cached server queries with a maximum age of 60 seconds.
4. WHEN a count query fails, THE Admin_Console SHALL display the remaining successful counts and a placeholder for the failed count with a retry affordance.

### Requirement 3: User oversight

**User Story:** As an Admin_User, I want to list and inspect Requo users, so that I can support and audit them.

#### Acceptance Criteria

1. WHEN an Admin_User visits `/admin/users`, THE Admin_Console SHALL display a paginated list of users with email, name, email-verified status, suspension status, created-at, and last-session-at values.
2. WHEN an Admin_User submits a search query on the users list, THE Admin_Console SHALL return users whose email or name contains the query as a case-insensitive substring.
3. WHEN an Admin_User opens a Target_User detail page, THE Admin_Console SHALL display the user profile, current account subscription status and plan, owned businesses, active session count, and recent audit log entries targeting that user.
4. THE users list SHALL return results ordered by `createdAt` descending by default.

### Requirement 4: User management actions

**User Story:** As an Admin_User, I want to perform support actions on a Target_User, so that I can unblock customer issues.

#### Acceptance Criteria

1. WHEN an Admin_User triggers force-email-verify on a Target_User, THE Admin_Console SHALL set the Target_User's `emailVerified` to true.
2. WHEN an Admin_User triggers revoke-all-sessions on a Target_User, THE Admin_Console SHALL delete every Better Auth session row belonging to the Target_User.
3. WHEN an Admin_User triggers suspend on a Target_User, THE Admin_Console SHALL mark the Target_User as suspended so that subsequent authentication attempts for that user are rejected.
4. WHEN an Admin_User triggers unsuspend on a Target_User, THE Admin_Console SHALL clear the suspension so that authentication attempts can succeed again.
5. WHEN an Admin_User triggers delete-user on a Target_User, THE Admin_Console SHALL delete the Target_User's user row and all data that cascades from it per the existing schema.
6. IF an Admin_User attempts to suspend, revoke-all-sessions, force-email-verify, or delete-user on their own user record, THEN THE Admin_Console SHALL reject the action and return an error.
7. WHEN any user-management action completes, THE Admin_Console SHALL display a success message identifying the action and the Target_User.

### Requirement 5: Business oversight

**User Story:** As an Admin_User, I want to list and inspect businesses, so that I can investigate customer setups and support requests.

#### Acceptance Criteria

1. WHEN an Admin_User visits `/admin/businesses`, THE Admin_Console SHALL display a paginated list of businesses with name, slug, owner email, plan, created-at, and member count.
2. WHEN an Admin_User submits a search query on the businesses list, THE Admin_Console SHALL return businesses whose name or slug contains the query as a case-insensitive substring.
3. WHEN an Admin_User opens a Target_Business detail page, THE Admin_Console SHALL display the business identity fields, owner summary, denormalized plan, member roster, inquiry count, quote count, and most recent activity timestamps.
4. THE Admin_Console SHALL present the business detail page as read-only in v1 with no mutation affordances.

### Requirement 6: Subscription oversight

**User Story:** As an Admin_User, I want to inspect account subscriptions and payment history, so that I can diagnose billing issues.

#### Acceptance Criteria

1. WHEN an Admin_User visits `/admin/subscriptions`, THE Admin_Console SHALL display a paginated list of `account_subscriptions` rows with owner email, plan, status, provider, current-period-end, and canceled-at values.
2. WHEN an Admin_User opens a Target_Subscription detail page, THE Admin_Console SHALL display subscription fields, the owner's recent `payment_attempts` rows, and the most recent `billing_events` rows referencing the same user.
3. WHEN an Admin_User filters the subscriptions list by status, THE Admin_Console SHALL return only rows whose `status` matches the selected value.

### Requirement 7: Subscription override actions

**User Story:** As an Admin_User, I want to manually adjust a Target_Subscription, so that I can grant comps and intervene when a customer cannot wait for normal billing flows.

#### Acceptance Criteria

1. WHEN an Admin_User performs a manual plan override on a Target_Subscription, THE Admin_Console SHALL route the change through Subscription_Service so that `account_subscriptions` and every owned `businesses.plan` value are updated in one write path.
2. WHEN an Admin_User performs force-cancel on a Target_Subscription, THE Admin_Console SHALL route the change through Subscription_Service to set the subscription status to `canceled` with `canceledAt` set to the current timestamp and every owned `businesses.plan` value downgraded accordingly.
3. WHERE Subscription_Service exposes an operation for a given admin override, THE Admin_Console SHALL call that operation rather than writing directly to `account_subscriptions`.
4. IF Subscription_Service returns an error from an override, THEN THE Admin_Console SHALL surface the error message to the Admin_User and make no partial writes.

### Requirement 8: Impersonation

**User Story:** As an Admin_User, I want to sign in as a Target_User, so that I can reproduce issues and act on their behalf during support.

#### Acceptance Criteria

1. WHEN an Admin_User starts impersonation of a Target_User, THE Admin_Console SHALL create a new Better Auth session for the Target_User, tag the session with the originating Admin_User's id, and replace the Admin_User's active session cookies with the Impersonation_Session cookies.
2. WHILE an Impersonation_Session is active, THE Admin_Console SHALL render a persistent banner in every authenticated layout that identifies the Target_User, identifies the originating Admin_User, and exposes a Stop Impersonating control.
3. WHEN the Admin_User invokes Stop Impersonating, THE Admin_Console SHALL end the Impersonation_Session and restore an admin session for the originating Admin_User without requiring the Admin_User to re-enter their password.
4. WHILE an Impersonation_Session is active, THE Admin_Console SHALL record the originating Admin_User's id on every audit log, billing event, and mutation produced by the session.
5. IF an Admin_User attempts to start impersonation on their own user record, THEN THE Admin_Console SHALL reject the action and return an error.
6. IF an Admin_User attempts to start a new Impersonation_Session while one is already active, THEN THE Admin_Console SHALL stop the existing session before starting the new one.

### Requirement 9: Password re-confirmation gate

**User Story:** As an Admin_User, I want to re-enter my password before running a Destructive_Action, so that a borrowed or left-open session cannot silently cause damage.

#### Acceptance Criteria

1. WHEN an Admin_User requests a Destructive_Action, THE Admin_Console SHALL prompt for Password_Reconfirmation before executing the action.
2. WHEN an Admin_User submits Password_Reconfirmation, THE Admin_Console SHALL validate the password against Better Auth using the Admin_User's credentials.
3. IF Password_Reconfirmation fails, THEN THE Admin_Console SHALL reject the Destructive_Action, record the failed attempt in the Audit_Log, and display an error to the Admin_User.
4. WHEN Password_Reconfirmation succeeds, THE Admin_Console SHALL authorize exactly one execution of the requested Destructive_Action and invalidate the confirmation token afterward.
5. THE Password_Reconfirmation token SHALL expire no later than 5 minutes after issue.

### Requirement 10: Audit logging

**User Story:** As the product owner, I want every admin view and action recorded, so that I can review what happened and prove accountability.

#### Acceptance Criteria

1. WHEN an Admin_User loads any `/admin` page, THE Admin_Console SHALL write an Audit_Log entry recording action, target type, target id, Admin_User id, Admin_User email, request IP address, and user agent.
2. WHEN an Admin_User performs a mutation through the Admin_Console, THE Admin_Console SHALL write an Audit_Log entry recording action, target type, target id, Admin_User id, Admin_User email, mutation metadata, request IP address, and user agent before returning the response.
3. WHEN an Admin_User performs a mutation while impersonating a Target_User, THE Admin_Console SHALL record both the originating Admin_User id and the Target_User id in the Audit_Log metadata.
4. IF writing an Audit_Log entry fails during a mutation, THEN THE Admin_Console SHALL abort the mutation and surface an error to the Admin_User.
5. THE Admin_Console SHALL expose `/admin/audit-logs` with a paginated view filterable by Admin_User, action, target type, and target id.
6. WHEN an Admin_User loads `/admin/audit-logs`, THE Admin_Console SHALL return entries ordered by `createdAt` descending.
