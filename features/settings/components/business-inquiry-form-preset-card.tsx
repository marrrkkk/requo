"use client";

import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";

import { useProgressRouter } from "@/hooks/use-progress-router";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
      <Card className="gap-0 border-border/75 bg-card/97">
        <CardHeader className="gap-3 pb-5">
          <CardTitle>Defaults</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-0">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {starterTemplate.label}
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              Rebuild the fields and public page from the selected starter template.
            </p>
          </div>

          <Button
            className="w-full"
            disabled={isPending}
            onClick={() => setIsDialogOpen(true)}
            type="button"
            variant="outline"
          >
            <RefreshCcw data-icon="inline-start" />
            Apply defaults
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply starter template defaults</DialogTitle>
            <DialogDescription>
              Current field and page customization will be replaced with the
              selected starter template defaults.
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Selected starter template
              </p>
              <p className="mt-2 text-base font-semibold tracking-tight text-foreground">
                {starterTemplate.label}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {starterTemplate.description}
              </p>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
              <p className="text-sm font-medium text-foreground">This will replace</p>
              <div className="grid gap-2 pt-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">
                    Inquiry form fields and labels
                  </span>
                  <span className="text-foreground">Reset</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">
                    Inquiry page copy and layout
                  </span>
                  <span className="text-foreground">Reset</span>
                </div>
              </div>
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
                  "Apply defaults"
                )}
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
