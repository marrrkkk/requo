"use client";

import { FileText } from "lucide-react";

import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";

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
    <ConfirmationDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onCancel();
      }}
      title="Apply template?"
      description={
        <>
          Applying &ldquo;{templateName}&rdquo; will replace your current
          title, notes, terms, validity date, and all line items. Customer
          details are kept.
        </>
      }
      confirmLabel="Apply template"
      onConfirm={onConfirm}
      tone="neutral"
      icon={FileText}
    />
  );
}
