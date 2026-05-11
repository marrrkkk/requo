import { AdminDashboard } from "@/features/admin/components/admin-dashboard";

/**
 * Admin console landing page.
 *
 * The admin layout (`app/admin/layout.tsx`) has already:
 *   - Enforced `requireAdminUser()` — unauthenticated, unverified, and
 *     non-allow-listed callers are rejected with `notFound()` before
 *     this page renders (Req 1.1, 1.2, 1.3, 1.6).
 *   - Written the `view.dashboard` audit row via
 *     `wrapAdminRouteWithViewLog` (Req 10.1).
 *
 * So the page itself stays thin: it composes `AdminDashboard`, which
 * is responsible for the six count tiles plus per-tile Suspense and
 * retry handling (Req 2.1, 2.3, 2.4).
 */
export default function AdminDashboardPage() {
  return <AdminDashboard />;
}
