import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAccountSecurityPath } from "@/features/account/routes";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Security",
  description: "Redirects to account-level security settings.",
});

export default async function BusinessSecuritySettingsPage() {
  redirect(getAccountSecurityPath());
}
