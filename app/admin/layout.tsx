import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AdminShell } from "@/features/admin/components/admin-shell";
import { requireAdminOrNull } from "@/features/admin/auth";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Requo admin",
  description: "Private internal admin tools for Requo.",
});

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AdminLayoutFallback />}>
      <AdminGuardedLayout>{children}</AdminGuardedLayout>
    </Suspense>
  );
}

function AdminLayoutFallback() {
  return (
    <div className="min-h-svh bg-background">
      <main className="mx-auto flex min-h-svh w-full max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">Loading internal tools...</p>
      </main>
    </div>
  );
}

async function AdminGuardedLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminOrNull();

  if (!admin) {
    notFound();
  }

  return <AdminShell admin={admin}>{children}</AdminShell>;
}
