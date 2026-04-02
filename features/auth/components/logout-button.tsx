"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      const result = await authClient.signOut();

      if (result.error) {
        return;
      }

      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <Button
      disabled={isPending}
      onClick={handleLogout}
      type="button"
      variant="outline"
    >
      <LogOut data-icon="inline-start" />
      {isPending ? "Signing out..." : "Sign out"}
    </Button>
  );
}
