/**
 * Cache headers for public pages (inquiry forms, quote response pages).
 *
 * These pages are served at the edge and benefit from CDN caching:
 * - `s-maxage=60` keeps the response fresh for 60 seconds at edge nodes.
 * - `stale-while-revalidate=300` allows serving stale content for up to
 *   300 additional seconds while the origin is refreshed asynchronously.
 * - `Vary: Accept-Encoding` prevents serving incorrectly encoded cached
 *   responses to clients with different encoding capabilities.
 */

export function publicPageCacheHeaders(): HeadersInit {
  return {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    Vary: "Accept-Encoding",
  };
}
