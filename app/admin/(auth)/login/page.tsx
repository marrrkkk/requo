import { redirect } from "next/navigation";

import { getOptionalSession } from "@/lib/auth/session";
import { getMainAppUrl } from "@/features/admin/access";
import { AdminLoginForm } from "@/features/admin/components/admin-login-form";

/**
 * Admin login page.
 *
 * Lives in the `(auth)` route group so it is NOT wrapped by the
 * console layout's gate. If the visitor is already authenticated with
 * role = "admin", redirect to the admin dashboard. If authenticated
 * without the admin role, redirect back to the main app — redirecting
 * to `/login` here would loop, because on the admin subdomain `/login`
 * is this page itself.
 */
export default async function AdminLoginPage() {
  const session = await getOptionalSession();

  if (session?.user.role === "admin") {
    redirect("/");
  }

  if (session?.user) {
    // Authenticated but not admin — back to the main app rather than
    // looping on this page.
    redirect(getMainAppUrl());
  }

  return <AdminLoginForm />;
}
