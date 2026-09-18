import { redirect } from "next/navigation";

import { absoluteUrl } from "@/lib/seo/site";
import { getOptionalSession } from "@/lib/auth/session";
import { refreshStripePlatformLink } from "@/features/payment-providers/mutations";

export const maxDuration = 30;

export async function GET(request: Request) {
  const attemptId = new URL(request.url).searchParams.get("attempt") ?? "";
  const session = await getOptionalSession();
  if (!session) redirect("/login");
  if (!attemptId) redirect("/home");

  const origin = absoluteUrl("/").toString().replace(/\/$/, "");
  const result = await refreshStripePlatformLink({
    attemptId,
    userId: session.user.id,
    returnUrl: `${origin}/api/payments/stripe/connect/return`,
    refreshUrl: `${origin}/api/payments/stripe/connect/refresh`,
  });
  if ("error" in result) {
    console.error("Stripe Connect refresh failed.", result.error);
    redirect("/home");
  }
  redirect(result.url);
}
