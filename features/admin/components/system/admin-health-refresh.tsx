"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { refreshAdminHealthAction } from "@/features/admin/actions/refresh-health";

export function AdminHealthRefresh() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRefresh() {
    startTransition(async () => {
      await refreshAdminHealthAction();
      router.refresh();
    });
  }

  return (
    <Button
      disabled={isPending}
      onClick={handleRefresh}
      size="sm"
      type="button"
      variant="outline"
    >
      {isPending ? (
        <Spinner className="size-4" />
      ) : (
        <RefreshCw className="size-4" />
      )}
      Refresh checks
    </Button>
  );
}
