import { redirect } from "next/navigation";

import { getOptionalSession } from "@/lib/auth/session";
import { AdminLoginForm } from "@/features/admin/components/admin-login-form";

/**
 * Admin login page.
 *
 * Lives in the `(auth)` route group so it is NOT wrapped by the
 * console layout's `requireAdminUser()` gate. If the admin is already
 * authenticated with role = "admin", redirect to the admin dashboard.
 * If authenticated without admin role, redirect to the main login page
 * so the user can sign in with an admin account.
 */
export default async function AdminLoginPage() {
  const session = await getOptionalSession();

  if (session?.user.role === "admin") {
    redirect("/");
  }

  if (session?.user) {
    // Authenticated but not admin — redirect to main login so they can
    // sign out and sign in with an admin account.
    redirect("/login");
  }

  return <AdminLoginForm />;
}
