import { redirect } from "next/navigation";

import { getAccountProfilePath } from "@/features/account/routes";

export default async function BusinessProfileSettingsPage() {
  redirect(getAccountProfilePath());
}
