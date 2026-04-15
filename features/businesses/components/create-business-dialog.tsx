"use client";

import { useState } from "react";
import { PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateBusinessForm } from "@/features/businesses/components/create-business-form";
import type { CreateBusinessActionState } from "@/features/businesses/types";
import type { WorkspaceListItem } from "@/features/workspaces/types";

type CreateBusinessDialogProps = {
  action: (
    state: CreateBusinessActionState,
    formData: FormData,
  ) => Promise<CreateBusinessActionState>;
  workspaces: WorkspaceListItem[];
  isLocked?: boolean;
};

export function CreateBusinessDialog({
  action,
  workspaces,
  isLocked,
}: CreateBusinessDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle data-icon="inline-start" />
          Create business
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[32rem]">
        <DialogHeader>
          <DialogTitle>Create new business</DialogTitle>
          <DialogDescription>
            Use a starter template to set up inquiry capture, quote defaults, and follow-up basics.
          </DialogDescription>
        </DialogHeader>
        <CreateBusinessForm
          action={action}
          workspaces={workspaces}
          isLocked={isLocked}
        />
      </DialogContent>
    </Dialog>
  );
}
