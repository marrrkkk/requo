import { redirect } from "next/navigation";

import { verifyAdminSession } from "@/lib/admin/auth";
import { AdminLoginForm } from "@/features/admin/components/admin-login-form";

/**
 * Admin login page.
 *
 * Lives in the `(auth)` route group so it is NOT wrapped by the
 * console layout's `requireAdminUser()` gate. If the admin is already
 * authenticated, redirect to the admin dashboard.
 */
export default async function AdminLoginPage() {
  if (await verifyAdminSession()) {
    redirect("/");
  }

  return <AdminLoginForm />;
}
