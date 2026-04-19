import { connection } from "next/server";
import { redirect } from "next/navigation";

import { getAccountProfilePath } from "@/features/account/routes";

export default async function AccountPage() {
  await connection();
  redirect(getAccountProfilePath());
}
