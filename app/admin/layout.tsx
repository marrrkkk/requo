import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
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
    <div className="flex min-h-svh w-full bg-background">
      {/* Sidebar skeleton */}
      <div className="hidden w-64 shrink-0 border-r border-border/70 bg-sidebar lg:block">
        <div className="flex h-[4.5rem] items-center gap-3 px-5">
          <Skeleton className="size-10 rounded-xl" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-16 rounded-md" />
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>
        </div>
        <div className="border-t border-sidebar-border px-5 pt-5">
          <div className="flex flex-col gap-1.5">
            {[60, 72, 55, 80, 48, 66, 90, 52].map((width, index) => (
              <div
                className="flex h-9 items-center gap-2 rounded-lg px-3"
                key={index}
              >
                <Skeleton className="size-4 rounded-md" />
                <Skeleton
                  className="h-4 rounded-md"
                  style={{ width: `${width}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur">
          <div className="flex min-h-11 items-center gap-3 px-6 py-3.5">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="h-4 w-24 rounded-md" />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="text-sm text-muted-foreground">
            Loading internal tools...
          </p>
        </div>
      </div>
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
