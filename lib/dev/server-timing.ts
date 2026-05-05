/**
 * Minimal dev-only timing helper for measuring server-side latency.
 *
 * Usage:
 *   const t = devTiming("getBusinessContext");
 *   const result = await getBusinessContextForMembershipSlug(...);
 *   t.end();
 *
 * All output is behind NODE_ENV === "development" — zero production noise.
 */

const isDev = process.env.NODE_ENV === "development";

export function devTiming(label: string) {
  if (!isDev) return { end: () => {} };

  const start = performance.now();

  return {
    end: () => {
      const ms = performance.now() - start;

      console.log(`⏱ ${label}: ${ms.toFixed(1)}ms`);
    },
  };
}

/**
 * Wraps an async function call with dev timing.
 *
 * Usage:
 *   const result = await timed("layoutShellData", Promise.all([...]));
 */
export async function timed<T>(label: string, promise: Promise<T>): Promise<T> {
  if (!isDev) return promise;

  const start = performance.now();
  const result = await promise;
  const ms = performance.now() - start;

  console.log(`⏱ ${label}: ${ms.toFixed(1)}ms`);

  return result;
}
