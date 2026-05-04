import { redirect } from "next/navigation";

import { getAccountSecurityPath } from "@/features/account/routes";

export default async function BusinessSecuritySettingsPage() {
  redirect(getAccountSecurityPath());
}
