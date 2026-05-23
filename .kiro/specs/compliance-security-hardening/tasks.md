# Implementation Plan: Compliance & Security Hardening

## Overview

This plan implements a comprehensive compliance and security hardening pass for Requo, covering security middleware (CSP + CSRF), rate limiter hardening, AI prompt injection defenses, expanded legal documents, public trust pages, cookie transparency, data export, and security.txt. Tasks are ordered to establish foundational security infrastructure first, then build features on top, and finish with integration wiring and legal content.

## Tasks

- [x] 1. Set up security middleware and CSRF utility
  - [x] 1.1 Create CSRF origin validation utility at `lib/security/csrf.ts`
    - Implement `validateOrigin` function that checks the Origin or Referer header against the configured application origin (read from `NEXT_PUBLIC_APP_URL` or `BETTER_AUTH_URL` env var, supporting localhost, production, and Vercel preview deploys without code changes)
    - Return `{ valid: true }` only on exact match (scheme + host + port)
    - Reject null, empty, subdomain, path-suffixed, and port-variant origins
    - Implement `isCsrfExempt` function and `CSRF_EXEMPT_PATHS` constant listing paths that skip origin validation: `/api/auth/`, `/api/billing/polar/webhook`, `/api/public/`, `/api/cron/`, `/.well-known/`, `/api/push/`
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6_

  - [ ]* 1.2 Write property test for CSRF origin validation
    - **Property 1: CSRF Origin Validation Correctness**
    - Generate arbitrary origin strings (subdomains, path-suffixed, port variations, null, empty, valid)
    - Assert `valid: true` if and only if origin exactly matches configured origin
    - Test file: `tests/unit/csrf-validation.property.test.ts`
    - Use fast-check with minimum 100 iterations
    - **Validates: Requirements 2.1, 2.2**

  - [x] 1.3 Create Next.js middleware at `middleware.ts`
    - Generate per-request nonce for CSP script-src
    - Build CSP header with directives: `default-src 'self'`, `script-src 'self' 'nonce-{nonce}'`, `style-src 'self' 'unsafe-inline'`, `img-src 'self' data: https:`, `connect-src 'self' https:`, `frame-ancestors 'none'`, `form-action 'self'`, `object-src 'none'`, `base-uri 'self'`
    - Apply CSP header only to HTML responses (skip API routes returning JSON)
    - Invoke CSRF origin validation for state-changing requests (POST, PUT, PATCH, DELETE) to `app/api/*` routes, skipping exempt paths (`/api/auth/*`, `/api/billing/polar/webhook`, `/api/public/*`, `/api/cron/*`, `/.well-known/*`, `/api/push/*`)
    - Return 403 on CSRF validation failure for non-exempt routes
    - Configure matcher to exclude static assets
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.10, 1.11, 2.1, 2.2, 2.3, 2.4_

  - [ ]* 1.4 Write unit tests for CSP header builder
    - Verify each directive produces correct output string
    - Verify nonce is included in script-src
    - Verify CSP is not applied to non-HTML responses
    - Test file: `tests/unit/csp-builder.test.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.10, 1.11_

- [x] 2. Harden rate limiter to fail-closed
  - [x] 2.1 Modify `lib/public-action-rate-limit.ts` to fail-closed on errors
    - Change catch block to return `false` (deny) instead of `true` (allow)
    - Add structured error logging with `{ error_type, action, timestamp, error_message }`
    - Ensure recovery is automatic when database becomes reachable again (no manual restart needed)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 2.2 Write property test for rate limiter fail-closed behavior
    - **Property 2: Rate Limiter Fail-Closed on Any Exception**
    - Generate arbitrary error types (connection errors, timeouts, query errors, runtime exceptions)
    - Assert rate limiter returns `false` for every generated error
    - Test file: `tests/unit/rate-limiter-fail-closed.property.test.ts`
    - Use fast-check with minimum 100 iterations
    - **Validates: Requirements 3.1, 3.2**

- [x] 3. Checkpoint — Security infrastructure
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement AI prompt injection protection
  - [x] 4.1 Create AI input sanitizer at `lib/ai/input-sanitizer.ts`
    - Implement `sanitizeAiInput` pure function returning `SanitizationResult`
    - Detect patterns: "ignore previous instructions", "ignore all prior", "system prompt", "you are now", "act as", role-switching attempts, delimiter injection (triple backticks, XML-style tags), encoded variants
    - Handle case variations and whitespace padding
    - Return `rejected` status for high-confidence injection attempts
    - Complete within 5ms per input (no network calls)
    - _Requirements: 4.1, 4.2, 4.5, 4.6, 4.7_

  - [ ]* 4.2 Write property test for AI input sanitizer
    - **Property 3: AI Input Sanitizer Neutralizes Injection Patterns**
    - Generate arbitrary strings with embedded injection patterns (case variations, whitespace, encoded)
    - Assert sanitized output does not contain original injection patterns in exploitable form
    - Test file: `tests/unit/ai-input-sanitizer.property.test.ts`
    - Use fast-check with minimum 100 iterations
    - **Validates: Requirements 4.1, 4.2, 4.5**

  - [x] 4.3 Create AI output filter at `lib/ai/output-filter.ts`
    - Implement `filterAiOutput` function returning `OutputFilterResult`
    - Accept output text and array of system prompt fragments
    - Detect and redact system prompt content, internal instruction leakage, sensitive config details
    - Preserve non-leaked portions unchanged
    - _Requirements: 4.3, 4.4_

  - [ ]* 4.4 Write property test for AI output filter
    - **Property 4: AI Output Filter Redacts System Prompt Leakage**
    - Generate response text with embedded system prompt fragments
    - Assert filtered output does not contain those fragments
    - Assert non-leaked portions are preserved unchanged
    - Test file: `tests/unit/ai-output-filter.property.test.ts`
    - Use fast-check with minimum 100 iterations
    - **Validates: Requirements 4.3, 4.4**

  - [x] 4.5 Create AI security events logging utility
    - Create helper function to log events to `ai_security_events` table
    - Log injection detected, injection rejected, and output redacted events
    - Include pattern matched, user ID, business ID, and SHA-256 input hash
    - _Requirements: 4.2, 4.4_

  - [x] 4.6 Integrate sanitizer and filter into existing AI features
    - Wire `sanitizeAiInput` before AI provider calls in quote generator and chat features
    - Wire `filterAiOutput` after AI responses
    - Return safe fallback response when input is rejected without calling AI provider
    - _Requirements: 4.1, 4.7_

- [x] 5. Checkpoint — AI protection layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Create database schema for data export and AI security events
  - [x] 6.1 Create Drizzle migration for `data_exports` and `ai_security_events` tables
    - Define `data_exports` table with columns: id, business_id, user_id, format, status, storage_path, file_size_bytes, parts, expires_at, error_message, created_at, completed_at
    - Define `ai_security_events` table with columns: id, event_type, pattern_matched, user_id, business_id, input_hash, created_at
    - Add appropriate foreign key references and check constraints
    - Run migration
    - _Requirements: 24.2, 4.2_

- [x] 7. Implement data export feature
  - [x] 7.1 Create data export service at `features/data-export/service.ts`
    - Implement `generateDataExport` function
    - Query inquiries, quotes, contacts, and files for the business
    - Serialize data in JSON or CSV format as chosen by the user
    - Upload archive to Supabase Storage private bucket
    - Generate signed URL with 72-hour expiry
    - Handle archive splitting for exports exceeding 2 GB
    - Record export status in `data_exports` table
    - _Requirements: 24.1, 24.2, 24.4, 24.5, 24.6, 24.7_

  - [ ]* 7.2 Write property test for data export serialization round-trip
    - **Property 5: Data Export Serialization Round-Trip**
    - Generate valid business data records (inquiries, quotes, contacts)
    - Serialize to JSON and CSV, parse back, assert equivalence
    - Test file: `tests/unit/data-export-serialization.property.test.ts`
    - Use fast-check with minimum 100 iterations
    - **Validates: Requirements 24.4**

  - [ ]* 7.3 Write property test for archive split correctness
    - **Property 6: Archive Split Produces Correctly Sized Parts**
    - Generate random total file sizes
    - Assert each part ≤ 2 GB and sum of parts equals total size
    - Test file: `tests/unit/archive-split.property.test.ts`
    - Use fast-check with minimum 100 iterations
    - **Validates: Requirements 24.6**

  - [x] 7.4 Create data export server action and UI trigger
    - Add server action for initiating export from business settings
    - Handle format selection (JSON/CSV)
    - Display error messages on failure with retry option
    - Show download link when export is ready
    - _Requirements: 24.1, 24.2, 24.3, 24.4_

- [x] 8. Checkpoint — Data export feature
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Create public trust pages and security.txt
  - [x] 9.1 Create security page at `app/(marketing)/security/page.tsx`
    - Cover: encryption (TLS 1.3, AES-256 at rest), authentication methods, access control, infrastructure, compliance alignment, security headers, responsible disclosure contact
    - Link to vulnerability disclosure policy
    - _Requirements: 18.1, 18.2, 18.3_

  - [x] 9.2 Create subprocessors page at `app/(marketing)/subprocessors/page.tsx`
    - List all subprocessors with: company name, purpose, data location, link to privacy policy/DPA
    - Include: Groq, Cerebras, Google (Gemini), OpenRouter, Mistral, Cloudflare, NVIDIA, Polar, Resend, Supabase, Vercel
    - _Requirements: 19.1, 19.2, 19.3_

  - [x] 9.3 Create DPA page at `app/(marketing)/legal/dpa/page.tsx`
    - Include: Standard Contractual Clauses (Module 2), technical and organizational measures annex, subprocessor list reference, Requo designated as Processor
    - _Requirements: 22.1, 22.2_

  - [x] 9.4 Create security.txt route handler at `app/.well-known/security-txt/route.ts`
    - Return text/plain response conforming to RFC 9116
    - Include: Contact (security@requo.app), Expires (date within 1 year), Preferred-Languages (en), Policy (link to vulnerability disclosure)
    - _Requirements: 21.1, 21.2_

  - [x] 9.5 Add vulnerability disclosure policy section to security page
    - Include: security@requo.app contact, scope of eligible targets, safe harbor language, 5 business days acknowledgment timeframe
    - _Requirements: 20.1, 20.2_

- [x] 10. Expand privacy policy at `app/(marketing)/privacy/`
  - [x] 10.1 Add Lawful Basis for Processing section
    - Table mapping processing activities to GDPR Article 6 bases
    - Cover: account creation, inquiry form, AI-assisted drafting, conversational AI, transactional email, analytics, billing, security logging
    - _Requirements: 5.1, 5.2_

  - [x] 10.2 Add Data Retention Schedule section
    - Specify retention periods for each data category
    - Cover: account data (account + 30 days), business content (business + 90 days), AI token logs (90 days), billing records (7 years), session/security logs (90 days), webhook events (1 year), rate limit events (30 days), analytics (duration of business)
    - _Requirements: 6.1, 6.2_

  - [x] 10.3 Add International Data Transfers section
    - List each provider with data location and role
    - Include all 11 providers from requirement 7.2
    - State Standard Contractual Clauses as transfer mechanism
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 10.4 Add Data Subject Rights section
    - Jurisdiction-specific subsections: EU/EEA/UK (GDPR), California (CCPA/CPRA), Philippines (Data Privacy Act)
    - List all rights per jurisdiction
    - Include contact method (privacy@requo.app) and 30-day response timeframe
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 10.5 Add AI Provider Data Practices section
    - Disclose data handling for each AI provider
    - State training data usage, retention policy, ZDR availability per provider
    - State no providers use Requo customer data for training via API
    - Include Mistral disclosure distinguishing API vs consumer chat product
    - _Requirements: 9.1, 9.2, 9.3, 25.1, 25.2, 25.3_

  - [x] 10.6 Add Automated Decision-Making, Breach Notification, and DNT/GPC sections
    - Automated Decision-Making: AI features assist only, no legal/significant automated decisions, human review required
    - Breach Notification: 72-hour notification commitment, email to affected holders, public disclosure if required by law
    - DNT/GPC: no cross-site tracking, no sale/sharing of personal info, honor GPC signals
    - _Requirements: 10.1, 10.2, 11.1, 11.2, 11.3, 12.1, 12.2_

- [x] 11. Amend Terms of Service at `app/(marketing)/terms/`
  - [x] 11.1 Add Force Majeure, Data Export Commitment, and Cure Period sections
    - Force Majeure: neither party liable for events beyond reasonable control; define covered events
    - Data Export: 30-day window after termination; specify included data types
    - Cure Period: 14 days written notice for non-security violations; immediate suspension for security risks
    - _Requirements: 13.1, 13.2, 14.1, 14.2, 15.1, 15.2, 15.3_

  - [x] 11.2 Add Modification Notice and SLA Reference sections
    - Modification Notice: 30 days advance notice for material changes via email and in-app notification
    - SLA: 99.9% monthly uptime target, reference public status page
    - _Requirements: 16.1, 16.2, 17.1, 17.2_

- [x] 12. Implement cookie consent banner
  - [x] 12.1 Create cookie banner component at `components/shared/cookie-banner.tsx`
    - Client component checking `sessionStorage` or cookie for dismissal state
    - Display text: "We use essential cookies for security and session management. See our Privacy Policy."
    - Link to Privacy Policy
    - Persist dismissal in `requo_cookie_consent` cookie (30-day expiry) or sessionStorage
    - _Requirements: 23.1, 23.2, 23.3, 23.4_

  - [x] 12.2 Wire cookie banner into public page layouts
    - Add `CookieBanner` to `app/(public)/layout.tsx`
    - Ensure banner only displays on public-facing pages (inquiry form, quote page)
    - _Requirements: 23.1_

- [x] 13. Checkpoint — Legal content and cookie banner
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Content verification and integration tests
  - [ ]* 14.1 Write content verification tests for legal pages
    - Verify privacy policy contains all required sections (lawful basis, retention, transfers, rights, AI practices, automated decisions, breach notification, DNT/GPC)
    - Verify terms of service contains required sections (force majeure, data export, cure period, modification notice, SLA)
    - Verify security page covers all required topics
    - Verify subprocessors page lists all required providers
    - Verify vulnerability disclosure has required elements
    - Test file: `tests/integration/legal-content.test.ts`
    - _Requirements: 5.1, 6.1, 7.1, 8.1, 9.1, 10.1, 11.1, 12.1, 13.1, 14.1, 15.1, 16.1, 17.1, 18.1, 19.1, 20.1_

  - [ ]* 14.2 Write integration tests for security middleware
    - Verify CSP header present on HTML responses
    - Verify CSP header absent on JSON API responses
    - Verify CSRF validation rejects cross-origin state-changing requests
    - Verify CSRF validation allows same-origin requests
    - Test file: `tests/integration/security-middleware.test.ts`
    - _Requirements: 1.1, 1.10, 2.1, 2.2_

  - [ ]* 14.3 Write integration test for rate limiter DB outage recovery
    - Simulate DB connection failure, verify deny response
    - Simulate DB recovery, verify normal behavior resumes
    - Test file: `tests/integration/rate-limiter-recovery.test.ts`
    - _Requirements: 3.1, 3.4_

  - [ ]* 14.4 Write integration test for AI protection in calling features
    - Verify calling features return safe fallback on rejected input
    - Verify output filter redacts before presenting to user
    - Test file: `tests/integration/ai-protection.test.ts`
    - _Requirements: 4.7, 4.4_

- [x] 15. Final checkpoint — All tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Legal content pages are static server components with no dynamic data fetching
- The middleware approach is chosen because the project currently has no `middleware.ts` file
- fast-check is used for all property-based tests (TypeScript PBT library)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "6.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.1"] },
    { "id": 2, "tasks": ["1.4", "2.2", "4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "4.5"] },
    { "id": 4, "tasks": ["4.4", "4.6", "7.1"] },
    { "id": 5, "tasks": ["7.2", "7.3", "7.4"] },
    { "id": 6, "tasks": ["9.1", "9.2", "9.3", "9.4"] },
    { "id": 7, "tasks": ["9.5", "10.1", "10.2", "10.3"] },
    { "id": 8, "tasks": ["10.4", "10.5", "10.6", "11.1"] },
    { "id": 9, "tasks": ["11.2", "12.1"] },
    { "id": 10, "tasks": ["12.2"] },
    { "id": 11, "tasks": ["14.1", "14.2", "14.3", "14.4"] }
  ]
}
```
