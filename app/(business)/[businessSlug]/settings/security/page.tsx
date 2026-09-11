import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getAccountSecurityPath } from "@/features/account/routes";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Security",
  description: "Redirects to account-level security settings.",
});

export const instant = true;

/**
 * Account-level security lives outside business settings — redirect.
 *
 * Sync shell so sibling navigation paints instantly; the redirect
 * lives in the Suspense child.
 */
export default function BusinessSecuritySettingsPage() {
  return (
    <Suspense fallback={null}>
      <SecurityRedirect />
    </Suspense>
  );
}

async function SecurityRedirect(): Promise<never> {
  redirect(getAccountSecurityPath());
}
