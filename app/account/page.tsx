import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { getAccountProfilePath } from "@/features/account/routes";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Account · Requo",
  description: "Redirects to the signed-in account profile settings.",
});

export const unstable_instant = { prefetch: 'static', unstable_disableValidation: true };

export default async function AccountPage() {
  await connection();
  redirect(getAccountProfilePath());
}
