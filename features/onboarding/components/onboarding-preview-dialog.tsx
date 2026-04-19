"use client";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { PublicInquiryPageRenderer } from "@/features/inquiries/components/public-inquiry-page-renderer";
import type {
  PublicInquiryBusiness,
  PublicInquiryFormState,
} from "@/features/inquiries/types";

type OnboardingPreviewDialogProps = {
  business: PublicInquiryBusiness;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

async function previewOnlyAction(
  state: PublicInquiryFormState,
  formData: FormData,
): Promise<PublicInquiryFormState> {
  void formData;
  return state;
}

export function OnboardingPreviewDialog({
  business,
  open,
  onOpenChange,
}: OnboardingPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="h-[100dvh] max-h-[100dvh] w-screen max-w-none rounded-none border-0 bg-background p-0 shadow-none sm:w-screen"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Inquiry page preview</DialogTitle>
        <DialogDescription className="sr-only">
          Review the generated inquiry page before finishing setup.
        </DialogDescription>

        <div className="flex h-full min-h-0 flex-col bg-background">
          <div className="sticky top-0 z-10 border-b border-border/75 bg-background/95 px-4 py-3 backdrop-blur sm:px-6 xl:px-8">
            <div className="mx-auto flex w-full max-w-[92rem] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="meta-label">Preview</p>
                <p className="font-heading text-lg font-semibold tracking-tight text-foreground">
                  Inquiry page preview
                </p>
              </div>

              <Button
                className="w-full sm:w-auto"
                onClick={() => onOpenChange(false)}
                type="button"
                variant="outline"
              >
                <ArrowLeft data-icon="inline-start" />
                Back to review
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <PublicInquiryPageRenderer
              action={previewOnlyAction}
              business={business}
              previewMode
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
