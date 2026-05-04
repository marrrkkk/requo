"use client";

import { useState } from "react";
import { PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateWorkspaceForm } from "./create-workspace-form";

type CreateWorkspaceDialogProps = {
  triggerVariant?: "button" | "card";
};

export function CreateWorkspaceDialog({
  triggerVariant = "button",
}: CreateWorkspaceDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerVariant === "card" ? (
        <Card
          aria-expanded={open}
          aria-haspopup="dialog"
          className="group flex cursor-pointer flex-col border-dashed border-border/80 bg-transparent transition-colors hover:border-border hover:bg-card/50"
          data-state={open ? "open" : "closed"}
          onClick={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") {
              return;
            }

            event.preventDefault();
            setOpen(true);
          }}
          role="button"
          tabIndex={0}
        >
          <CardHeader className="gap-4">
            <div className="flex items-center gap-3 text-muted-foreground transition-colors group-hover:text-foreground">
              <PlusCircle className="size-5" />
              <CardTitle className="text-lg">New workspace</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-end space-y-5">
            <CardDescription className="max-w-full">
              Create a separate workspace for a different team, client, or project.
            </CardDescription>
            <Button asChild className="w-full sm:w-auto" variant="secondary">
              <div>Create workspace</div>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DialogTrigger asChild>
          <Button>
            <PlusCircle data-icon="inline-start" />
            New workspace
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[32rem]">
        <DialogHeader>
          <DialogTitle>Create new workspace</DialogTitle>
          <DialogDescription>
            Create a separate workspace for a different team, client, or project.
          </DialogDescription>
        </DialogHeader>
        <CreateWorkspaceForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
