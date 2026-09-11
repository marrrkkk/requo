/**
 * Settings index only redirects (see page.tsx) — no skeleton.
 *
 * The layout shell (sidebar + topbar from businessSlug + groups) already
 * paints instantly; the redirect resolves in the page's Suspense child.
 */
export default function BusinessSettingsLoading() {
  return null;
}
