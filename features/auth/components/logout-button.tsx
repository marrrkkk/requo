"use client";

import type { ComponentProps } from "react";
import { LogOut } from "lucide-react";
import { useTransition } from "react";

import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { themeStorageKey, themeUserStorageKey } from "@/features/theme/types";

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

      window.localStorage.removeItem(themeUserStorageKey);
      window.localStorage.removeItem(themeStorageKey);

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
      {isPending ? (
        <>
          <Spinner data-icon="inline-start" aria-hidden="true" />
          Signing out...
        </>
      ) : (
        <>
          <LogOut data-icon="inline-start" />
          Sign out
        </>
      )}
    </Button>
  );
}
