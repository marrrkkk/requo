# Design Document

## Overview

This design addresses a comprehensive compliance and security hardening pass for Requo, covering HTTP security headers, CSRF protection, rate limiter hardening, AI prompt injection defenses, expanded legal documents, public trust pages, cookie transparency, data export, and security.txt.

The implementation follows a layered approach:
1. **Security middleware layer** — CSP headers and CSRF validation via Next.js middleware
2. **Rate limiter hardening** — fail-closed behavior in the existing `lib/public-action-rate-limit.ts`
3. **AI protection layer** — input sanitizer and output filter as pure functions in `lib/ai/`
4. **Legal content expansion** — updated privacy policy, terms of service, and new public trust pages
5. **Data export feature** — server action + background job producing downloadable archives
6. **Well-known routes** — security.txt at `app/.well-known/security-txt/`

## Architecture

```mermaid
graph TD
    subgraph "Request Pipeline"
        A[Incoming Request] --> B[Next.js Middleware]
        B -->|HTML responses| C[CSP Header Injection]
        B -->|State-changing API| D[CSRF Origin Validation]
        B --> E[Route Handler / Page]
    end

    subgraph "Rate Limiting"
        E -->|Public actions| F[Rate Limiter]
        F -->|DB error| G[Fail-Closed: Deny]
        F -->|DB success| H[Normal Check]
    end

    subgraph "AI Protection"
        E -->|AI features| I[AI Input Sanitizer]
        I -->|Clean input| J[AI Provider Call]
        J --> K[AI Output Filter]
        K -->|Clean output| L[Response to User]
        I -->|Injection detected| M[Safe Fallback Response]
    end

    subgraph "Public Trust Pages"
        N[/security]
        O[/subprocessors]
        P[/legal/dpa]
        Q[/.well-known/security.txt]
    end

    subgraph "Data Export"
        R[Export Action] --> S[Generate Archive]
        S --> T[Upload to Supabase Storage]
        T --> U[Signed URL for Download]
    end
```

### Key Design Decisions

1. **Middleware for CSP + CSRF**: Next.js middleware runs before route handlers, making it the natural place for response headers and origin validation. Since the project has no middleware file yet, we create one.

2. **CSP nonce for scripts**: Next.js App Router uses inline scripts for hydration. We use a per-request nonce added to `script-src` and injected via `<Script>` component support, avoiding `unsafe-inline` for scripts while keeping `unsafe-inline` for styles (required by Tailwind/Next.js).

3. **Rate limiter fail-closed**: The current implementation catches errors and returns `true` (allow). We invert this to return `false` (deny) on any error, with structured error logging.

4. **AI sanitizer as pure function**: A stateless, synchronous function that returns sanitized text or a rejection signal. No network calls, testable in isolation, composable with any AI feature.

5. **Legal pages as static content**: Privacy policy, terms, security page, subprocessors, and DPA are server components rendering markdown-style content. No dynamic data fetching needed.

6. **Data export via Supabase Storage**: Archives are generated server-side, uploaded to a private bucket, and served via time-limited signed URLs (72h expiry).

## Components and Interfaces

### 1. Security Middleware (`middleware.ts`)

```typescript
// Root middleware.ts
export function middleware(request: NextRequest): NextResponse {
  // 1. CSP header injection for HTML responses
  // 2. CSRF origin validation for state-changing API requests
  //    (skipped for exempt paths: /api/auth/*, /api/billing/polar/webhook,
  //     /api/public/*, /api/cron/*, /.well-known/*, /api/push/*)
}

export const config = {
  matcher: [
    // Match all paths except static assets
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

### 2. CSRF Validation Utility (`lib/security/csrf.ts`)

```typescript
export interface CsrfValidationResult {
  valid: boolean;
  reason?: string;
}

/** Paths exempt from CSRF origin validation (use alternative auth mechanisms) */
export const CSRF_EXEMPT_PATHS = [
  "/api/auth/",        // Better Auth handles its own security
  "/api/billing/polar/webhook", // HMAC signature verification
  "/api/public/",      // Public endpoints with rate limiting
  "/api/cron/",        // Vercel cron secret authentication
  "/.well-known/",     // Discovery, OAuth, and MCP endpoints
  "/api/push/",        // Push subscription from service workers
];

export function isCsrfExempt(pathname: string): boolean;

export function validateOrigin(
  requestHeaders: Headers,
  allowedOrigin: string
): CsrfValidationResult;
```

### 3. Rate Limiter (modified `lib/public-action-rate-limit.ts`)

```typescript
// Existing interface unchanged
// Internal behavior change: catch block returns false instead of true
// New: structured error logging
```

### 4. AI Input Sanitizer (`lib/ai/input-sanitizer.ts`)

```typescript
export interface SanitizationResult {
  status: "clean" | "sanitized" | "rejected";
  output: string;
  patterns: string[]; // matched patterns if any
}

export function sanitizeAiInput(input: string): SanitizationResult;
```

### 5. AI Output Filter (`lib/ai/output-filter.ts`)

```typescript
export interface OutputFilterResult {
  status: "clean" | "redacted";
  output: string;
  redactedPatterns: string[];
}

export function filterAiOutput(
  output: string,
  systemPromptFragments: string[]
): OutputFilterResult;
```

### 6. Data Export Service (`features/data-export/service.ts`)

```typescript
export interface DataExportOptions {
  businessId: string;
  format: "json" | "csv";
  userId: string;
}

export interface DataExportResult {
  success: boolean;
  downloadUrl?: string;
  expiresAt?: Date;
  error?: string;
  parts?: number; // >1 if split
}

export async function generateDataExport(
  options: DataExportOptions
): Promise<DataExportResult>;
```

### 7. Cookie Banner Component (`components/shared/cookie-banner.tsx`)

```typescript
// Client component that checks sessionStorage/cookie for dismissal
// Renders dismissible banner on public pages
export function CookieBanner(): React.ReactElement | null;
```

### 8. Public Trust Pages

| Route | Component Location | Type |
|-------|-------------------|------|
| `/security` | `app/(marketing)/security/page.tsx` | Static server component |
| `/subprocessors` | `app/(marketing)/subprocessors/page.tsx` | Static server component |
| `/legal/dpa` | `app/(marketing)/legal/dpa/page.tsx` | Static server component |
| `/.well-known/security.txt` | `app/.well-known/security-txt/route.ts` | Route handler (text/plain) |

## Data Models

### Public Action Events (existing, unchanged)

```typescript
// publicActionEvents table — already exists
// Used by rate limiter, no schema changes needed
```

### Data Export Records (new table)

```sql
CREATE TABLE data_exports (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  format TEXT NOT NULL CHECK (format IN ('json', 'csv')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  storage_path TEXT,
  file_size_bytes BIGINT,
  parts INTEGER DEFAULT 1,
  expires_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### AI Security Log (new table)

```sql
CREATE TABLE ai_security_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('injection_detected', 'injection_rejected', 'output_redacted')),
  pattern_matched TEXT,
  user_id TEXT,
  business_id TEXT,
  input_hash TEXT, -- SHA-256 of input, not raw content
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Cookie Consent (client-side only)

Cookie banner dismissal state stored in `sessionStorage` key `requo_cookie_dismissed` or a `requo_cookie_consent` cookie with 30-day expiry. No server-side table needed.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: CSRF Origin Validation Correctness

*For any* origin string, the CSRF validation function SHALL return `valid: true` if and only if the origin exactly matches the configured application origin (scheme + host + port). All other origin strings — including subdomains, path-suffixed variants, port variations, and null/empty values — SHALL be rejected.

**Validates: Requirements 2.1, 2.2**

### Property 2: Rate Limiter Fail-Closed on Any Exception

*For any* exception thrown during the database rate-check operation (including connection errors, timeouts, query errors, and unexpected runtime exceptions), the rate limiter SHALL return `false` (deny the action).

**Validates: Requirements 3.1, 3.2**

### Property 3: AI Input Sanitizer Neutralizes Injection Patterns

*For any* input string containing one or more known prompt injection patterns (including case variations, whitespace padding, and encoded variants), the sanitizer output SHALL NOT contain the original injection pattern in a form that could manipulate the AI system prompt.

**Validates: Requirements 4.1, 4.2, 4.5**

### Property 4: AI Output Filter Redacts System Prompt Leakage

*For any* AI response text containing fragments of the system prompt or internal instructions, the filtered output SHALL NOT contain those fragments. The non-leaked portions of the response SHALL be preserved unchanged.

**Validates: Requirements 4.3, 4.4**

### Property 5: Data Export Serialization Round-Trip

*For any* valid business data record (inquiry, quote, or contact), serializing it to the chosen export format (JSON or CSV) and then parsing it back SHALL produce a record equivalent to the original.

**Validates: Requirements 24.4**

### Property 6: Archive Split Produces Correctly Sized Parts

*For any* total export size, the archive splitting function SHALL produce parts where each part is at most 2 GB and the sum of all part sizes equals the total export size.

**Validates: Requirements 24.6**

## Error Handling

### Middleware Errors

- If the CSP builder encounters an unexpected error, the response is served without CSP (fail-open for availability) and the error is logged.
- If CSRF validation encounters a malformed request, respond with 403 (fail-closed for security).

### Rate Limiter Errors

- Any database error → deny the action (return `false`)
- Log structured error with: `{ error_type, action, timestamp, error_message }`
- No retry logic — the request is simply denied

### AI Sanitizer Errors

- The sanitizer is a pure synchronous function; it cannot throw network errors.
- If an unexpected error occurs in regex processing (e.g., catastrophic backtracking), catch and return `rejected` status to deny the input.

### AI Output Filter Errors

- If the filter encounters an error during processing, return the original output unchanged (fail-open for user experience) and log the error.
- Rationale: a failed filter is less dangerous than a blocked response, since system prompts don't contain user secrets.

### Data Export Errors

- Database query timeout → return error with "Export timed out, please retry with a smaller date range"
- Storage upload failure → clean up partial uploads, return error, allow retry
- File too large → split into parts (handled by Property 6)
- All failures are idempotent — retrying does not corrupt or duplicate data

## Testing Strategy

### Property-Based Testing

**Library**: [fast-check](https://github.com/dubzzz/fast-check) (TypeScript PBT library, already widely used in the Node.js ecosystem)

**Configuration**: Minimum 100 iterations per property test.

**Property tests** (referencing design properties above):

| Property | Test File | Focus |
|----------|-----------|-------|
| Property 1 | `tests/unit/csrf-validation.property.test.ts` | Origin string generation with variations |
| Property 2 | `tests/unit/rate-limiter-fail-closed.property.test.ts` | Error type generation |
| Property 3 | `tests/unit/ai-input-sanitizer.property.test.ts` | String generation with embedded patterns |
| Property 4 | `tests/unit/ai-output-filter.property.test.ts` | Response generation with prompt fragments |
| Property 5 | `tests/unit/data-export-serialization.property.test.ts` | Business data generation |
| Property 6 | `tests/unit/archive-split.property.test.ts` | Random file size generation |

**Tag format**: `Feature: compliance-security-hardening, Property {number}: {property_text}`

### Unit Tests (Example-Based)

- CSP builder: verify each directive produces correct output string
- Security.txt: verify RFC 9116 conformance
- Cookie banner: component test for render/dismiss behavior

### Integration Tests

- Middleware: verify CSP header presence/absence on different response types
- Rate limiter: simulate DB outage and recovery
- Data export: end-to-end with test business data
- AI protection: verify calling features handle rejection correctly

### Content Verification Tests

- Privacy policy page: verify presence of required sections (lawful basis, retention, transfers, rights, AI practices, automated decisions, breach notification, DNT/GPC)
- Terms of service page: verify presence of required sections (force majeure, data export, cure period, modification notice, SLA)
- Security page: verify required security posture topics
- Subprocessors page: verify all listed subprocessors appear
- Vulnerability disclosure: verify required elements (contact, scope, safe harbor, timeframe)

### Dual Testing Approach

- **Unit tests** verify specific examples, edge cases, and error conditions (e.g., specific CSP directives, specific injection patterns like "ignore previous instructions")
- **Property tests** verify universal properties across all inputs (e.g., no origin other than the configured one passes, no injection pattern survives sanitization)
- Both are complementary: unit tests catch known specific bugs, property tests discover unknown edge cases through randomization

