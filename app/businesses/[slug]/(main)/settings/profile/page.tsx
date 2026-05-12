import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAccountProfilePath } from "@/features/account/routes";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Profile",
  description: "Redirects to account-level profile settings.",
});

export default async function BusinessProfileSettingsPage() {
  redirect(getAccountProfilePath());
}
