import "server-only";

import { notFound } from "next/navigation";

import { requireAdminOrNull } from "@/features/admin/auth";

export async function requireAdminPage() {
  const admin = await requireAdminOrNull();

  if (!admin) {
    notFound();
  }

  return admin;
}
