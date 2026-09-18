import { redirect } from "next/navigation";

import { getBusinessSettingsPath } from "@/features/businesses/routes";
import { completeStripePlatformConnection } from "@/features/payment-providers/mutations";
import { getOptionalSession } from "@/lib/auth/session";

export const maxDuration = 30;

export async function GET(request: Request) {
  const attemptId = new URL(request.url).searchParams.get("attempt") ?? "";
  const session = await getOptionalSession();
  if (!session) redirect("/login");
  if (!attemptId) redirect("/home");

  const result = await completeStripePlatformConnection({ attemptId, userId: session.user.id });
  if ("error" in result) {
    console.error("Stripe Connect return failed.", result.error);
    if (result.businessSlug) redirect(`${getBusinessSettingsPath(result.businessSlug, "integrations")}?stripe=error`);
    redirect("/home");
  }
  redirect(`${getBusinessSettingsPath(result.businessSlug, "integrations")}?stripe=${result.status}`);
}
