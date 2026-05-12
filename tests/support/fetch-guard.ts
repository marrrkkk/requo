/**
 * Outbound-HTTP guard used by Vitest unit/component runs.
 *
 * Monkey-patches `globalThis.fetch` so any request to a host other than
 * `127.0.0.1` or `localhost` fails fast with a message pointing the reader at
 * `tests/support/third-party-mocks.ts`. Local requests are delegated to the
 * original `fetch` unchanged so Next.js route handlers and local Postgres
 * plumbing keep working.
 *
 * Required by Requirements 7.3 and 7.4.
 */

const LOCAL_HOSTNAMES = new Set(["127.0.0.1", "localhost"]);

function resolveRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  // Request-like object (standard Request, Next.js NextRequest, or any duck-typed value with a .url)
  const candidate = (input as { url?: unknown }).url;
  if (typeof candidate === "string") {
    return candidate;
  }
  return String(input);
}

export function installFetchGuard(): void {
  const original = globalThis.fetch;

  const guardedFetch: typeof fetch = async (input, init) => {
    const rawUrl = resolveRequestUrl(input);
    // Use 127.0.0.1 as the base so relative URLs resolve to a local host and pass the guard.
    const { hostname } = new URL(rawUrl, "http://127.0.0.1");

    if (!LOCAL_HOSTNAMES.has(hostname)) {
      throw new Error(
        `[outbound-http-guard] Blocked request to ${hostname} from a test. ` +
          `Mock the client via tests/support/third-party-mocks.ts.`,
      );
    }

    return original(input, init);
  };

  globalThis.fetch = guardedFetch;
}
