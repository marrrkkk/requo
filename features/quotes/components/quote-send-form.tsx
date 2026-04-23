"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Copy, SendHorizontal } from "lucide-react";
import { toast } from "sonner";

import { FormActions } from "@/components/shared/form-layout";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  customerQuoteUrl: string | null;
  customerContactMethod?: string;
  disabled?: boolean;
};

const initialState: QuoteSendActionState = {};
const manualSendGuideStorageKey = "requo-manual-quote-send-guide-hidden";

export function QuoteSendForm({
  action,
  customerQuoteUrl,
  customerContactMethod,
  disabled = false,
}: QuoteSendFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const requoSubmitRef = useRef<HTMLButtonElement>(null);
  const manualSubmitRef = useRef<HTMLButtonElement>(null);
  const [, formAction, isPending] = useActionStateWithSonner(
    action,
    initialState,
  );
  const [manualMode, setManualMode] = useState(false);
  const [isManualGuideOpen, setIsManualGuideOpen] = useState(false);
  const [isNonEmailGuideOpen, setIsNonEmailGuideOpen] = useState(false);
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
    if (!customerQuoteUrl) {
      return false;
    }

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

  if (!customerQuoteUrl) {
    return (
      <Alert>
        <AlertTitle>Customer link unavailable</AlertTitle>
        <AlertDescription>
          Requo couldn&apos;t recover the secure customer link for this quote, so
          sending is temporarily unavailable.
        </AlertDescription>
      </Alert>
    );
  }

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
        <button
          aria-hidden="true"
          className="hidden"
          disabled={disabled || isPending}
          name="deliveryMethod"
          ref={manualSubmitRef}
          tabIndex={-1}
          type="submit"
          value="manual"
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
          {customerContactMethod === "email" || !customerContactMethod ? (
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
          ) : (
            <Button
              disabled={disabled || isPending}
              onClick={() => {
                setManualMode(true);
                setIsNonEmailGuideOpen(true);
              }}
              type="button"
            >
              {isPending ? (
                <Spinner data-icon="inline-start" aria-hidden="true" />
              ) : (
                <SendHorizontal data-icon="inline-start" />
              )}
              {isMarkingManualSent ? "Marking sent..." : "Send quote"}
            </Button>
          )}
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
      <Dialog open={isNonEmailGuideOpen} onOpenChange={setIsNonEmailGuideOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send quote</DialogTitle>
            <DialogDescription>
              Copy the message below and send it to your customer via{" "}
              <span className="capitalize">{customerContactMethod}</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <div className="relative rounded-md border bg-muted/40 p-4 pt-10 text-sm leading-relaxed text-foreground">
              <Button
                className="absolute right-2 top-2 h-7 w-7 text-muted-foreground hover:bg-transparent hover:text-foreground"
                size="icon"
                variant="ghost"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      `Hi, here is your requested quote:\n\n${customerQuoteUrl}`,
                    );
                    toast.success("Message copied.");
                  } catch {
                    toast.error("We couldn't copy the message.");
                  }
                }}
                type="button"
                title="Copy message"
              >
                <Copy className="size-3.5" />
              </Button>
              <span className="whitespace-pre-wrap">
                Hi, here is your requested quote:{"\n\n"}
                <span className="break-all font-mono text-sm">{customerQuoteUrl}</span>
              </span>
            </div>
            
            <div className="soft-panel flex flex-col gap-3 px-4 py-4 shadow-none">
              <ol className="flex flex-col gap-2 text-sm leading-6 text-muted-foreground">
                <li>1. Send the copied quote to your customer.</li>
                <li>
                  2. Come back here and click Okay to move the quote into the sent
                  stage.
                </li>
              </ol>
            </div>
          </DialogBody>
          <DialogFooter>
            <CopyQuoteLinkButton url={customerQuoteUrl} />
            <Button
              onClick={() => {
                setIsNonEmailGuideOpen(false);
              }}
              type="button"
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
