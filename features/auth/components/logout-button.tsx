"use client";

import type { ComponentProps } from "react";
import { LogOut } from "lucide-react";
import { useTransition } from "react";

import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

type LogoutButtonProps = Pick<
  ComponentProps<typeof Button>,
  "className" | "size" | "variant"
>;

export function LogoutButton({
  className,
  size = "default",
  variant = "outline",
}: LogoutButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      const result = await authClient.signOut();

      if (result.error) {
        return;
      }

      window.location.assign("/login");
    });
  }

  return (
    <Button
      className={className}
      disabled={isPending}
      onClick={handleLogout}
      size={size}
      type="button"
      variant={variant}
    >
      <LogOut data-icon="inline-start" />
      {isPending ? "Signing out..." : "Sign out"}
    </Button>
  );
}
