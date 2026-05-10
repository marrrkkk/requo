import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAccountSecurityPath } from "@/features/account/routes";

export const metadata: Metadata = {
  title: "Security",
};

export default async function BusinessSecuritySettingsPage() {
  redirect(getAccountSecurityPath());
}
