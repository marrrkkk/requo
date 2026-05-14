"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  BellRing,
  Check,
  Copy,
  ExternalLink,
  Link2,
  Mail,
  SendHorizontal,
} from "lucide-react";
import { toast } from "sonner";

import { ProFeatureNoticeButton } from "@/components/shared/pro-feature-notice-button";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type {
  QuoteSendActionState,
  QuoteSendChannel,
  QuoteStatus,
} from "@/features/quotes/types";
import {
  type FollowUpCreateActionState,
} from "@/features/follow-ups/types";
import {
  getDefaultFollowUpChannel,
  getQuickFollowUpDueDate,
} from "@/features/follow-ups/utils";
import {
  buildMailtoUrl,
  formatQuoteMoney,
  generateQuoteEmailBody,
  generateQuoteEmailSubject,
  generateQuoteFollowUpMessage,
  getChannelMessage,
  getDefaultSendChannel,
  quoteSendChannelLabels,
} from "@/features/quotes/utils";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { useProgressRouter } from "@/hooks/use-progress-router";

/* -------------------------------------------------------------------------- */

type QuoteSummaryForSend = {
  quoteNumber: string;
  title: string;
  customerName: string;
  customerEmail: string | null;
  customerContactMethod: string;
  customerContactHandle: string;
  totalInCents: number;
  currency: string;
  validUntil: string;
  status: QuoteStatus;
  publicViewedAt?: Date | null;
};

type SendQuoteDialogProps = {
  sendAction: (
    state: QuoteSendActionState,
    formData: FormData,
  ) => Promise<QuoteSendActionState>;
  logEventAction: (
    eventType: string,
    channel?: string,
  ) => Promise<{ error?: string }>;
  createFollowUpAction?: (
    state: FollowUpCreateActionState,
    formData: FormData,
  ) => Promise<FollowUpCreateActionState>;
  quote: QuoteSummaryForSend;
  customerQuoteUrl: string | null;
  businessName: string;
  isRequoEmailAvailable: boolean;
  pdfExportHref?: string;
  pdfExportLocked?: boolean;
  disabled?: boolean;
};

const initialSendState: QuoteSendActionState = {};

/* -------------------------------------------------------------------------- */

export function SendQuoteDialog({
  sendAction,
  logEventAction,
  createFollowUpAction,
  quote,
  customerQuoteUrl,
  businessName,
  isRequoEmailAvailable,
  pdfExportHref,
  pdfExportLocked = false,
  disabled = false,
}: SendQuoteDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"ready" | "sent">("ready");
  const formRef = useRef<HTMLFormElement>(null);
  const reqSubmitRef = useRef<HTMLButtonElement>(null);
  const manSubmitRef = useRef<HTMLButtonElement>(null);
  const [sendState, formAction, isPending] = useActionStateWithSonner(
    sendAction,
    initialSendState,
  );
  const [, startLogging] = useTransition();

  const detectedChannel = getDefaultSendChannel(quote.customerContactMethod);
  const [selectedChannel, setSelectedChannel] =
    useState<QuoteSendChannel>(detectedChannel);
  const templateInput = {
    customerName: quote.customerName,
    businessName,
    quoteLink: customerQuoteUrl ?? "",
  };
  const primaryMessage = getChannelMessage(detectedChannel, templateInput);
  const [editedMessage, setEditedMessage] = useState(primaryMessage);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const isEmailContact = detectedChannel === "email";
  const showRequoOption =
    isRequoEmailAvailable && isEmailContact && quote.customerEmail;

  function handleOpenChange(next: boolean) {
    if (next) {
      setStep("ready");
      setSelectedChannel(detectedChannel);
      setEditedMessage(getChannelMessage(detectedChannel, templateInput));
      setCopiedField(null);
    }
    setOpen(next);
  }

  if (sendState?.success && step === "ready") {
    queueMicrotask(() => setStep("sent"));
  }

  /* --- Copy helpers --- */

  async function copyText(text: string, label: string, eventType?: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied.`);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
      if (eventType) {
        startLogging(async () => {
          await logEventAction(eventType, selectedChannel);
        });
      }
    } catch {
      toast.error(`Couldn't copy ${label.toLowerCase()}.`);
    }
  }

  function handleCopyLink() {
    if (!customerQuoteUrl) return;
    void copyText(customerQuoteUrl, "Link", "copied_link");
  }

  function handleCopyMessage() {
    void copyText(editedMessage, "Message", "copied_message");
  }

  function handleCopyFollowUp() {
    const followUpMsg = generateQuoteFollowUpMessage(templateInput);
    void copyText(followUpMsg, "Follow-up", "copied_followup");
  }

  function handleOpenEmailApp() {
    if (!quote.customerEmail || !customerQuoteUrl) return;
    startLogging(async () => {
      await logEventAction("opened_email_app", "email");
    });
  }

  function handleSendWithRequo() {
    if (disabled || isPending) return;
    formRef.current?.requestSubmit(reqSubmitRef.current ?? undefined);
  }

  function handleMarkAsSent() {
    if (disabled || isPending) return;
    formRef.current?.requestSubmit(manSubmitRef.current ?? undefined);
  }

  /* --- Mailto URL --- */

  const mailtoUrl =
    quote.customerEmail && customerQuoteUrl
      ? buildMailtoUrl({
          to: quote.customerEmail,
          subject: generateQuoteEmailSubject(businessName),
          body: generateQuoteEmailBody(templateInput),
        })
      : null;

  /* --- Render --- */

  if (!customerQuoteUrl) {
    return (
      <Alert>
        <AlertTitle>Customer link unavailable</AlertTitle>
        <AlertDescription>
          The secure customer link couldn&apos;t be recovered. Sending is
          temporarily unavailable.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={disabled} type="button">
          <SendHorizontal data-icon="inline-start" />
          Send quote
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        {step === "ready" ? (
          <>
            <DialogHeader>
              <DialogTitle>Send quote</DialogTitle>
              <DialogDescription>
                Deliver {quote.quoteNumber} to {quote.customerName}.
              </DialogDescription>
            </DialogHeader>

            <DialogBody className="flex flex-col gap-5 pt-1">
              {/* Quote summary row */}
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {quote.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {quoteSendChannelLabels[detectedChannel]} · {quote.customerContactHandle}
                  </p>
                </div>
                <p className="shrink-0 text-base font-semibold tracking-tight text-foreground">
                  {formatQuoteMoney(quote.totalInCents, quote.currency)}
                </p>
              </div>

              {/* Hidden form for submit */}
              <form ref={formRef} action={formAction} className="hidden">
                <button
                  aria-hidden="true"
                  disabled={disabled || isPending}
                  name="deliveryMethod"
                  ref={reqSubmitRef}
                  tabIndex={-1}
                  type="submit"
                  value="requo"
                />
                <button
                  aria-hidden="true"
                  disabled={disabled || isPending}
                  name="deliveryMethod"
                  ref={manSubmitRef}
                  tabIndex={-1}
                  type="submit"
                  value="manual"
                />
              </form>

              {/* Message preview */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="meta-label">Message</p>
                  <Button
                    onClick={handleCopyMessage}
                    size="xs"
                    type="button"
                    variant="ghost"
                  >
                    {copiedField === "Message" ? (
                      <Check data-icon="inline-start" className="size-3" />
                    ) : (
                      <Copy data-icon="inline-start" className="size-3" />
                    )}
                    {copiedField === "Message" ? "Copied" : "Copy"}
                  </Button>
                </div>
                <textarea
                  className="w-full resize-none rounded-lg border border-input bg-muted/30 px-3.5 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  onChange={(e) => setEditedMessage(e.target.value)}
                  rows={3}
                  value={editedMessage}
                />
              </div>

              {/* Quick actions row */}
              <div className="flex items-center gap-2">
                <Button
                  className="flex-1"
                  onClick={handleCopyLink}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {copiedField === "Link" ? (
                    <Check data-icon="inline-start" className="size-3.5" />
                  ) : (
                    <Link2 data-icon="inline-start" className="size-3.5" />
                  )}
                  {copiedField === "Link" ? "Copied" : "Copy link"}
                </Button>

                {pdfExportHref ? (
                  <Button asChild className="flex-1" size="sm" variant="outline">
                    <a href={pdfExportHref} target="_blank" rel="noopener noreferrer">
                      <ExternalLink data-icon="inline-start" className="size-3.5" />
                      PDF
                    </a>
                  </Button>
                ) : pdfExportLocked ? (
                  <ProFeatureNoticeButton
                    className="flex-1"
                    noticeDescription="Upgrade to Pro to download quote PDFs."
                    noticeTitle="PDF is a Pro feature."
                    size="sm"
                    variant="outline"
                  >
                    <ExternalLink data-icon="inline-start" className="size-3.5" />
                    PDF
                  </ProFeatureNoticeButton>
                ) : null}
              </div>
            </DialogBody>

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              {/* Primary send action */}
              {showRequoOption ? (
                <>
                  <Button
                    className="w-full"
                    disabled={disabled || isPending}
                    onClick={handleSendWithRequo}
                    type="button"
                  >
                    {isPending ? (
                      <Spinner data-icon="inline-start" aria-hidden="true" />
                    ) : (
                      <SendHorizontal data-icon="inline-start" />
                    )}
                    {isPending ? "Sending..." : "Send with Requo"}
                  </Button>
                  <div className="flex w-full items-center gap-2">
                    {isEmailContact && mailtoUrl ? (
                      <Button
                        asChild
                        className="flex-1"
                        onClick={handleOpenEmailApp}
                        variant="outline"
                      >
                        <a href={mailtoUrl} target="_blank" rel="noopener noreferrer">
                          <Mail data-icon="inline-start" />
                          Email app
                        </a>
                      </Button>
                    ) : null}
                    <Button
                      className="flex-1"
                      disabled={disabled || isPending}
                      onClick={handleMarkAsSent}
                      type="button"
                      variant="outline"
                    >
                      <Check data-icon="inline-start" />
                      Mark as sent
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex w-full items-center gap-2">
                  {isEmailContact && mailtoUrl ? (
                    <Button
                      asChild
                      className="flex-1"
                      onClick={handleOpenEmailApp}
                    >
                      <a href={mailtoUrl} target="_blank" rel="noopener noreferrer">
                        <Mail data-icon="inline-start" />
                        Open email app
                      </a>
                    </Button>
                  ) : null}
                  <Button
                    className="flex-1"
                    disabled={disabled || isPending}
                    onClick={handleMarkAsSent}
                    type="button"
                    variant={isEmailContact && mailtoUrl ? "outline" : "default"}
                  >
                    {isPending ? (
                      <Spinner data-icon="inline-start" aria-hidden="true" />
                    ) : (
                      <Check data-icon="inline-start" />
                    )}
                    {isPending ? "Marking..." : "Mark as sent"}
                  </Button>
                </div>
              )}
            </DialogFooter>
          </>
        ) : (
          /* --- Sent confirmation step --- */
          <>
            <DialogHeader>
              <DialogTitle>Quote sent</DialogTitle>
              <DialogDescription>
                {sendState?.success ?? `${quote.quoteNumber} marked as sent.`}
              </DialogDescription>
            </DialogHeader>

            <DialogBody className="flex flex-col gap-5">
              <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <Check className="size-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Tracking is active
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Requo will notify you when the customer views, accepts, or
                    declines this quote.
                  </p>
                </div>
              </div>

              {createFollowUpAction ? (
                <QuoteFollowUpPrompt
                  action={createFollowUpAction}
                  onCopyFollowUp={handleCopyFollowUp}
                  quote={quote}
                  selectedChannel={selectedChannel}
                />
              ) : null}
            </DialogBody>

            <DialogFooter>
              <Button className="w-full" onClick={() => setOpen(false)} type="button">
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */

function QuoteFollowUpPrompt({
  action,
  onCopyFollowUp,
  quote,
  selectedChannel,
}: {
  action: (
    state: FollowUpCreateActionState,
    formData: FormData,
  ) => Promise<FollowUpCreateActionState>;
  onCopyFollowUp: () => void;
  quote: QuoteSummaryForSend;
  selectedChannel: QuoteSendChannel;
}) {
  const router = useProgressRouter();
  const [customOpen, setCustomOpen] = useState(false);
  const [customDueDate, setCustomDueDate] = useState(
    getQuickFollowUpDueDate("3d"),
  );
  const [dismissed, setDismissed] = useState(false);
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    {} as FollowUpCreateActionState,
  );
  const followUpChannel = getDefaultFollowUpChannel(selectedChannel);
  const followUpTitle = `Follow up on quote ${quote.quoteNumber}`;
  const followUpReason = quote.publicViewedAt
    ? "Follow up because the customer viewed this quote but has not responded."
    : "Follow up with the customer about this quote if they have not responded.";

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  if (state.success) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-border/60 px-4 py-3.5">
        <BellRing className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Follow-up reminder set
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            It will appear in your follow-ups list.
          </p>
        </div>
      </div>
    );
  }

  if (dismissed) {
    return null;
  }

  const hiddenFieldValues = { title: followUpTitle, reason: followUpReason, channel: followUpChannel };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          Set a follow-up reminder?
        </p>
        <Button
          onClick={() => setDismissed(true)}
          size="xs"
          type="button"
          variant="ghost"
        >
          Skip
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["tomorrow", "Tomorrow"],
          ["3d", "3 days"],
          ["7d", "7 days"],
        ].map(([value, label]) => (
          <form action={formAction} key={value}>
            <input name="title" type="hidden" value={hiddenFieldValues.title} />
            <input name="reason" type="hidden" value={hiddenFieldValues.reason} />
            <input name="channel" type="hidden" value={hiddenFieldValues.channel} />
            <input name="dueDate" type="hidden" value={getQuickFollowUpDueDate(value as "tomorrow" | "3d" | "7d")} />
            <Button disabled={isPending} size="sm" type="submit" variant="outline">
              {label}
            </Button>
          </form>
        ))}
        <Button
          onClick={() => setCustomOpen((v) => !v)}
          size="sm"
          type="button"
          variant="outline"
        >
          Custom
        </Button>
      </div>

      {customOpen ? (
        <form action={formAction} className="flex items-end gap-2 rounded-lg border border-border/60 p-3">
          <input name="title" type="hidden" value={hiddenFieldValues.title} />
          <input name="reason" type="hidden" value={hiddenFieldValues.reason} />
          <input name="channel" type="hidden" value={hiddenFieldValues.channel} />
          <input name="dueDate" type="hidden" value={customDueDate} />
          <div className="min-w-0 flex-1">
            <p className="meta-label mb-1.5">Due date</p>
            <DatePicker
              id="quote-follow-up-custom-date"
              name="dueDate"
              onChange={setCustomDueDate}
              required
              value={customDueDate}
            />
          </div>
          <Button disabled={isPending} size="sm" type="submit">
            {isPending ? (
              <Spinner data-icon="inline-start" aria-hidden="true" />
            ) : (
              <BellRing data-icon="inline-start" />
            )}
            Set
          </Button>
        </form>
      ) : null}

      <Button
        className="w-fit"
        onClick={onCopyFollowUp}
        size="xs"
        type="button"
        variant="ghost"
      >
        <Copy data-icon="inline-start" className="size-3" />
        Copy follow-up message
      </Button>
    </div>
  );
}
