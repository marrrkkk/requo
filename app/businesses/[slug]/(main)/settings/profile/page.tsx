import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAccountProfilePath } from "@/features/account/routes";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function BusinessProfileSettingsPage() {
  redirect(getAccountProfilePath());
}
