import { redirect } from "next/navigation";

export default async function SettingsPage() {
  redirect("/dashboard/settings/general");
}
