"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

/**
 * Minimal admin sidebar footer with sign-out.
 *
 * Clears the admin JWT session via `POST /api/admin/logout` and returns
 * to the admin login page.
 */
export function AdminFooterMenu() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSignOut() {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/logout", {
          method: "POST",
        });

        if (!response.ok) {
          setError("Could not sign out. Try again.");
          return;
        }

        router.replace("/login");
        router.refresh();
      } catch {
        setError("Could not sign out. Try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            className="min-h-10 rounded-lg px-3 py-2 text-muted-foreground"
            disabled={isPending}
            onClick={handleSignOut}
            tooltip="Sign out"
          >
            <LogOut />
            <span>Sign out</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      {error ? (
        <p className="px-3 text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
