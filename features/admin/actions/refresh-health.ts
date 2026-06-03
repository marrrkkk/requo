"use server";

import { revalidateTag } from "next/cache";

import { requireAdminUser } from "@/features/admin/access";
import { adminSystemTag } from "@/lib/cache/admin-tags";

export async function refreshAdminHealthAction(): Promise<{ success: true }> {
  await requireAdminUser();
  revalidateTag(adminSystemTag(), "max");
  return { success: true };
}
