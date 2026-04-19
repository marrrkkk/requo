"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Copy, SendHorizontal } from "lucide-react";
import { toast } from "sonner";

import { FormActions } from "@/components/shared/form-layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { CopyQuoteLinkButton } from "@/features/quotes/components/copy-quote-link-button";
import type {
  QuoteDeliveryMethod,
  QuoteSendActionState,
} from "@/features/quotes/types";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";

type QuoteSendFormProps = {
  action: (
    state: QuoteSendActionState,
    formData: FormData,
  ) => Promise<QuoteSendActionState>;
  customerQuoteUrl: string;
  disabled?: boolean;
};

const initialState: QuoteSendActionState = {};
const manualSendGuideStorageKey = "requo-manual-quote-send-guide-hidden";

export function QuoteSendForm({
  action,
  customerQuoteUrl,
  disabled = false,
}: QuoteSendFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const requoSubmitRef = useRef<HTMLButtonElement>(null);
  const [, formAction, isPending] = useActionStateWithSonner(
    action,
    initialState,
  );
  const [manualMode, setManualMode] = useState(false);
  const [isManualGuideOpen, setIsManualGuideOpen] = useState(false);
  const [hideManualGuide, setHideManualGuide] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      return window.localStorage.getItem(manualSendGuideStorageKey) === "1";
    } catch (error) {
      console.error("Failed to read the manual quote send preference.", error);
      return false;
    }
  });
  const [submitMode, setSubmitMode] = useState<QuoteDeliveryMethod | null>(null);

  useEffect(() => {
    try {
      if (hideManualGuide) {
        window.localStorage.setItem(manualSendGuideStorageKey, "1");
      } else {
        window.localStorage.removeItem(manualSendGuideStorageKey);
      }
    } catch (error) {
      console.error("Failed to save the manual quote send preference.", error);
    }
  }, [hideManualGuide]);

  async function copyCustomerLink() {
    try {
      await navigator.clipboard.writeText(customerQuoteUrl);
      toast.success("Customer link copied.");
      return true;
    } catch (error) {
      console.error("Failed to copy the customer quote link.", error);
      toast.error("We couldn't copy the customer link.");
      return false;
    }
  }

  async function handleManualSetup() {
    if (disabled || isPending) {
      return;
    }

    setManualMode(true);
    await copyCustomerLink();

    if (!hideManualGuide) {
      setIsManualGuideOpen(true);
    }
  }

  function handleSendWithRequo() {
    if (disabled || isPending) {
      return;
    }

    setSubmitMode("requo");
    formRef.current?.requestSubmit(requoSubmitRef.current ?? undefined);
  }

  const activeSubmitMode = isPending ? submitMode : null;
  const isSendingWithRequo = activeSubmitMode === "requo";
  const isMarkingManualSent = activeSubmitMode === "manual";

  return (
    <>
      <form action={formAction} className="flex flex-col gap-4" ref={formRef}>
        <button
          aria-hidden="true"
          className="hidden"
          disabled={disabled || isPending}
          name="deliveryMethod"
          ref={requoSubmitRef}
          tabIndex={-1}
          type="submit"
          value="requo"
        />

        {manualMode ? (
          <div className="soft-panel flex flex-col gap-4 px-4 py-4 shadow-none">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-foreground">
                Manual send selected
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                Send the copied customer link from your own inbox or chat, then
                confirm it here so Requo starts tracking the quote as sent.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <CopyQuoteLinkButton url={customerQuoteUrl} />
              <Button
                disabled={disabled || isPending}
                name="deliveryMethod"
                onClick={() => setSubmitMode("manual")}
                type="submit"
                value="manual"
              >
                {isMarkingManualSent ? (
                  <>
                    <Spinner data-icon="inline-start" aria-hidden="true" />
                    Marking sent...
                  </>
                ) : (
                  "Sent"
                )}
              </Button>
            </div>
          </div>
        ) : null}

        <FormActions>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={disabled || isPending} type="button">
                {isPending ? (
                  <Spinner data-icon="inline-start" aria-hidden="true" />
                ) : (
                  <SendHorizontal data-icon="inline-start" />
                )}
                {isSendingWithRequo
                  ? "Sending quote..."
                  : isMarkingManualSent
                    ? "Marking sent..."
                    : "Send quote"}
                {!isPending ? <ChevronDown data-icon="inline-end" /> : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={handleSendWithRequo}>
                  <SendHorizontal />
                  Send with Requo
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    void handleManualSetup();
                  }}
                >
                  <Copy />
                  Send manually
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </FormActions>
      </form>

      <Dialog open={isManualGuideOpen} onOpenChange={setIsManualGuideOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send manually</DialogTitle>
            <DialogDescription>
              Requo copied the customer link. Send it from your own email or
              chat, then return here and click Sent.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <div className="soft-panel flex flex-col gap-3 px-4 py-4 shadow-none">
              <p className="meta-label">How it works</p>
              <ol className="flex flex-col gap-2 text-sm leading-6 text-muted-foreground">
                <li>1. Paste the copied customer link into your own message.</li>
                <li>2. Send the quote outside Requo.</li>
                <li>
                  3. Come back here and click Sent to move the quote into the
                  sent stage.
                </li>
              </ol>
            </div>

            <label className="soft-panel flex items-center gap-3 px-3 py-3 shadow-none">
              <input
                checked={hideManualGuide}
                className="size-4 rounded border border-input/95"
                onChange={(event) =>
                  setHideManualGuide(event.currentTarget.checked)
                }
                type="checkbox"
              />
              <span className="text-sm text-foreground">
                Don&apos;t show this again
              </span>
            </label>
          </DialogBody>
          <DialogFooter>
            <CopyQuoteLinkButton url={customerQuoteUrl} />
            <Button onClick={() => setIsManualGuideOpen(false)} type="button">
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
