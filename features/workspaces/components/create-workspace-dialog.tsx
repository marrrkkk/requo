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
import { CreateWorkspaceForm } from "./create-workspace-form";

export function CreateWorkspaceDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle data-icon="inline-start" />
          New workspace
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[32rem]">
        <DialogHeader className="mb-4">
          <DialogTitle>Create new workspace</DialogTitle>
          <DialogDescription>
            Create a separate workspace for a different team, client, or project.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto pr-2">
          {/* We strip out the outer form section styling by nesting the form component directly */}
          <CreateWorkspaceForm />
        </div>
      </DialogContent>
    </Dialog>
  );
}
