"use client";

import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";

import { useProgressRouter } from "@/hooks/use-progress-router";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
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
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { getStarterTemplateDefinition } from "@/features/businesses/starter-templates";
import type { BusinessType } from "@/features/inquiries/business-types";
import type { BusinessInquiryFormActionState } from "@/features/settings/types";

type BusinessInquiryFormPresetCardProps = {
  action: (
    state: BusinessInquiryFormActionState,
    formData: FormData,
  ) => Promise<BusinessInquiryFormActionState>;
  businessType: BusinessType;
  formId: string;
};

const initialState: BusinessInquiryFormActionState = {};

export function BusinessInquiryFormPresetCard({
  action,
  businessType,
  formId,
}: BusinessInquiryFormPresetCardProps) {
  const router = useProgressRouter();
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    initialState,
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const starterTemplate = getStarterTemplateDefinition(businessType);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    router.refresh();
  }, [router, state.success]);

  return (
    <>
      <Card size="sm" className="gap-0 border-border/75 bg-card/97">
        <CardHeader className="gap-1 border-b border-border/70 pb-3">
          <CardTitle>Reset</CardTitle>
          <CardDescription className="text-xs leading-5">
            Rebuild fields and page copy from a starter template.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
            <div className="min-w-0">
              <p className="meta-label">Starter template</p>
              <p className="text-sm font-medium text-foreground">
                {starterTemplate.label}
              </p>
            </div>
            <Button
              disabled={isPending}
              onClick={() => setIsDialogOpen(true)}
              size="sm"
              type="button"
              variant="outline"
            >
              <RefreshCcw data-icon="inline-start" />
              Apply defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reset to starter template?</DialogTitle>
            <DialogDescription>
              This will replace your current fields and page copy with the
              {" "}{starterTemplate.label} template defaults.
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <p className="text-sm font-medium text-foreground">What gets replaced</p>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-muted-foreground/50" />
                  Inquiry form fields and labels
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-muted-foreground/50" />
                  Page headline, description, and copy
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-muted-foreground/50" />
                  Supporting cards and layout
                </li>
              </ul>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              onClick={() => setIsDialogOpen(false)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <form action={formAction}>
              <input name="formId" type="hidden" value={formId} />
              <input name="businessType" type="hidden" value={businessType} />
              <Button
                disabled={isPending}
                onClick={() => setIsDialogOpen(false)}
                type="submit"
              >
                {isPending ? (
                  <>
                    <Spinner data-icon="inline-start" aria-hidden="true" />
                    Applying...
                  </>
                ) : (
                  "Reset form"
                )}
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
