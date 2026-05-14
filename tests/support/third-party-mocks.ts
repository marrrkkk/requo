/**
 * Third-party client mocks for Requo tests.
 *
 * Each wrapper installs a `vi.mock` call against the Requo-side module path
 * the application imports from, never the SDK's npm package. That way the
 * mock is applied wherever the app reaches for the client — routes, server
 * actions, feature mutations — without needing to know which provider SDK
 * sits behind the wrapper.
 *
 * Usage:
 *   import { mockResend, mockPaddle } from "@/tests/support/third-party-mocks";
 *   mockResend();
 *   mockPaddle();
 *   // ...then normal imports of the code under test.
 *
 * Tests that need a specific response per case can override the mock with
 * `vi.mocked(sendQuoteEmail).mockResolvedValueOnce(...)` from the module
 * itself. These wrappers never pre-populate data — they stub each named
 * export with a harmless, success-shaped no-op.
 *
 * _Requirements: 7.3, 11.4_
 */
import { vi } from "vitest";

/**
 * Mocks `@/lib/resend/client` — the app's single entry point for Resend
 * transactional email sends (auth, invite, inquiry notifications, quote
 * lifecycle emails) and its two error-inspection helpers.
 *
 * Call at the top of the test file, outside any `beforeEach`.
 */
export function mockResend(): void {
  vi.mock("@/lib/resend/client", () => ({
    sendMagicLinkEmail: vi.fn(async () => undefined),
    sendPasswordResetEmail: vi.fn(async () => undefined),
    sendVerificationEmail: vi.fn(async () => undefined),
    sendBusinessMemberInviteEmail: vi.fn(async () => true),
    sendPublicInquiryNotificationEmail: vi.fn(async () => undefined),
    sendQuoteEmail: vi.fn(async () => undefined),
    sendQuoteSentOwnerNotificationEmail: vi.fn(async () => undefined),
    sendQuoteResponseOwnerNotificationEmail: vi.fn(async () => undefined),
    getResendFromEmailConfigurationError: vi.fn(() => null),
    getResendSendFailureMessage: vi.fn(() => null),
  }));
}

/**
 * Mocks `@/lib/ai/groq-provider` — the Groq-backed `AiProvider` used by the
 * app's AI router fallback chain.
 *
 * Call at the top of the test file, outside any `beforeEach`.
 */
export function mockGroq(): void {
  vi.mock("@/lib/ai/groq-provider", () => ({
    groqProvider: {
      name: "groq",
      isConfigured: vi.fn(() => false),
      generateCompletion: vi.fn(async () => ({
        provider: "groq",
        model: "test-model",
        text: "",
        usage: undefined,
        raw: null,
      })),
      generateStream: vi.fn(async () => ({
        provider: "groq",
        model: "test-model",
        stream: (async function* () {})(),
      })),
    },
  }));
}

/**
 * Mocks `@/lib/ai/gemini-provider` — the Gemini-backed `AiProvider` used by
 * the app's AI router fallback chain.
 *
 * Call at the top of the test file, outside any `beforeEach`.
 */
export function mockGemini(): void {
  vi.mock("@/lib/ai/gemini-provider", () => ({
    geminiProvider: {
      name: "gemini",
      isConfigured: vi.fn(() => false),
      generateCompletion: vi.fn(async () => ({
        provider: "gemini",
        model: "test-model",
        text: "",
        usage: undefined,
        raw: null,
      })),
      generateStream: vi.fn(async () => ({
        provider: "gemini",
        model: "test-model",
        stream: (async function* () {})(),
      })),
    },
  }));
}

/**
 * Mocks `@/lib/ai/cerebras-provider` — the Cerebras-backed `AiProvider`
 * used as the second fallback in the AI router chain.
 *
 * Call at the top of the test file, outside any `beforeEach`.
 */
export function mockCerebras(): void {
  vi.mock("@/lib/ai/cerebras-provider", () => ({
    cerebrasProvider: {
      name: "cerebras",
      isConfigured: vi.fn(() => false),
      generateCompletion: vi.fn(async () => ({
        provider: "cerebras",
        model: "test-model",
        text: "",
        usage: undefined,
        raw: null,
      })),
      generateStream: vi.fn(async () => ({
        provider: "cerebras",
        model: "test-model",
        stream: (async function* () {})(),
      })),
    },
  }));
}

/**
 * Mocks `@/lib/billing/providers/paddle` — the card-payment provider module
 * that owns transaction creation, adjustments/refunds, subscription reads,
 * lifecycle mutations, and webhook signature verification.
 *
 * Call at the top of the test file, outside any `beforeEach`.
 */
export function mockPaddle(): void {
  vi.mock("@/lib/billing/providers/paddle", () => ({
    createPaddleTransaction: vi.fn(async () => ({
      type: "redirect" as const,
      url: "txn_test",
    })),
    getPaddleTransaction: vi.fn(async () => null),
    createPaddleAdjustment: vi.fn(async () => ({
      type: "ok" as const,
      adjustmentId: "adj_test",
      status: "pending_approval" as const,
    })),
    getPaddleAdjustment: vi.fn(async () => null),
    mapPaddleAdjustmentStatus: vi.fn(() => "pending_approval" as const),
    getPaddleSubscription: vi.fn(async () => null),
    cancelPaddleSubscription: vi.fn(async () => true),
    resumePaddleSubscription: vi.fn(async () => true),
    verifyPaddleWebhookSignature: vi.fn(() => true),
    mapPaddleStatus: vi.fn(() => "active" as const),
  }));
}

/**
 * Mocks `@/lib/supabase/admin` — the app's service-role Supabase client
 * factory, which is used exclusively for storage operations (logo uploads,
 * avatar uploads, inquiry attachments). The returned client exposes the
 * `storage.from(bucket)` chain with success-shaped responses; tests that
 * need specific behavior can override individual methods per case.
 *
 * The browser/server Supabase clients are intentionally not mocked here —
 * they are realtime/auth surfaces and have no third-party network footprint
 * that needs blanket stubbing.
 *
 * Call at the top of the test file, outside any `beforeEach`.
 */
export function mockSupabaseStorage(): void {
  vi.mock("@/lib/supabase/admin", () => ({
    createSupabaseAdminClient: vi.fn(() => ({
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn(async () => ({ data: { path: "" }, error: null })),
          download: vi.fn(async () => ({ data: new Blob(), error: null })),
          remove: vi.fn(async () => ({ data: [], error: null })),
          createSignedUrl: vi.fn(async () => ({
            data: { signedUrl: "" },
            error: null,
          })),
          getPublicUrl: vi.fn(() => ({ data: { publicUrl: "" } })),
          list: vi.fn(async () => ({ data: [], error: null })),
          copy: vi.fn(async () => ({ data: { path: "" }, error: null })),
          move: vi.fn(async () => ({ data: { message: "ok" }, error: null })),
        })),
      },
    })),
  }));
}

/**
 * Convenience helper that installs every third-party mock in this module.
 *
 * Call at the top of the test file, outside any `beforeEach`.
 */
export function mockAllThirdParties(): void {
  mockResend();
  mockGroq();
  mockGemini();
  mockCerebras();
  mockPaddle();
  mockSupabaseStorage();
}
