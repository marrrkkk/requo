"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CheckoutDialogProps } from "@/features/billing/types";

type ControlledCheckoutDialogProps = CheckoutDialogProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChangePlan?: () => void;
};

export function CheckoutDialog({
  open,
  onOpenChange,
  plan,
  interval = "monthly",
}: ControlledCheckoutDialogProps) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Checkout moved to a dedicated page</DialogTitle>
          <DialogDescription>
            Continue in the new secure inline Paddle checkout flow.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Button
            className="w-full"
            onClick={() => {
              const params = new URLSearchParams({
                interval,
                plan,
              });
              router.push(`/account/billing/checkout?${params.toString()}`);
              onOpenChange(false);
            }}
          >
            Continue to checkout
          </Button>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
