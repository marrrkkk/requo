"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type ApplyTemplateConfirmDialogProps = {
  open: boolean;
  templateName: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ApplyTemplateConfirmDialog({
  open,
  templateName,
  onConfirm,
  onCancel,
}: ApplyTemplateConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apply template?</AlertDialogTitle>
          <AlertDialogDescription>
            Applying &ldquo;{templateName}&rdquo; will replace your current
            title, notes, terms, validity date, and all line items. Customer
            details are kept.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button type="button" onClick={onConfirm}>
              Apply template
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
