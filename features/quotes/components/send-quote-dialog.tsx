"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  BellRing,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Mail,
  SendHorizontal,
} from "lucide-react";
import { toast } from "sonner";

import { ProFeatureNoticeButton } from "@/components/shared/pro-feature-notice-button";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type {
  QuoteSendActionState,
  QuoteSendChannel,
  QuoteStatus,
} from "@/features/quotes/types";
import { quoteSendChannels } from "@/features/quotes/types";
import {
  type FollowUpCreateActionState,
} from "@/features/follow-ups/types";
import {
  getDefaultFollowUpChannel,
  getQuickFollowUpDueDate,
} from "@/features/follow-ups/utils";
import {
  buildMailtoUrl,
  formatQuoteDate,
  formatQuoteMoney,
  generateQuoteEmailBody,
  generateQuoteEmailSubject,
  generateQuoteFollowUpMessage,
  getChannelMessage,
  getChannelPrimaryAction,
  getDefaultSendChannel,
  getSendChannelLabel,
  quoteSendChannelLabels,
  quoteStatusLabels,
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
  const channelAction = getChannelPrimaryAction(detectedChannel);
  const templateInput = {
    customerName: quote.customerName,
    businessName,
    quoteLink: customerQuoteUrl ?? "",
  };
  const primaryMessage = getChannelMessage(detectedChannel, templateInput);
  const [editedMessage, setEditedMessage] = useState(primaryMessage);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showMarkSentConfirm, setShowMarkSentConfirm] = useState(false);

  const isEmailContact = detectedChannel === "email";
  const showRequoOption =
    isRequoEmailAvailable && isEmailContact && quote.customerEmail;

  // Reset state when dialog opens
  function handleOpenChange(next: boolean) {
    if (next) {
      setStep("ready");
      setSelectedChannel(detectedChannel);
      setEditedMessage(
        getChannelMessage(detectedChannel, templateInput),
      );
      setCopiedField(null);
      setShowMarkSentConfirm(false);
    }

    setOpen(next);
  }

  // After form submit succeeds, detect via sendState
  if (sendState?.success && step === "ready") {
    // Move to sent step on next render
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
      toast.error(`Couldn't copy ${label.toLowerCase()}. Try selecting and copying manually.`);
    }
  }

  function handleCopyLink() {
    if (!customerQuoteUrl) return;
    void copyText(customerQuoteUrl, "Quote link", "copied_link");
  }

  function handleCopyMessage() {
    void copyText(editedMessage, "Message", "copied_message");
  }

  function handleCopyFollowUp() {
    const followUpMsg = generateQuoteFollowUpMessage(templateInput);
    void copyText(followUpMsg, "Follow-up message", "copied_followup");
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
    setShowMarkSentConfirm(true);
  }

  function confirmMarkAsSent() {
    setShowMarkSentConfirm(false);
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
          Requo couldn&apos;t recover the secure customer link for this quote, so
          sending is temporarily unavailable.
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

      <DialogContent className="sm:max-w-lg">
        {step === "ready" ? (
          <>
            <DialogHeader>
              <DialogTitle>Send quote</DialogTitle>
              <DialogDescription>
                Send this quote to {quote.customerName} via their preferred
                channel.
              </DialogDescription>
            </DialogHeader>

            <DialogBody className="flex flex-col gap-5">
              {/* --- Quote summary --- */}
              <div className="soft-panel flex flex-col gap-3 px-4 py-4 shadow-none">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium text-foreground">
                      {quote.customerName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {quote.quoteNumber} · {quote.title}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {quoteStatusLabels[quote.status] ?? quote.status}
                  </Badge>
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="meta-label">Total</p>
                    <p className="mt-0.5 font-medium text-foreground">
                      {formatQuoteMoney(quote.totalInCents, quote.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="meta-label">Valid until</p>
                    <p className="mt-0.5 text-foreground">
                      {formatQuoteDate(quote.validUntil)}
                    </p>
                  </div>
                  <div>
                    <p className="meta-label">Channel</p>
                    <p className="mt-0.5 text-foreground">
                      {quoteSendChannelLabels[detectedChannel]}
                    </p>
                  </div>
                  <div>
                    <p className="meta-label">Send to</p>
                    <p className="mt-0.5 truncate text-foreground">
                      {quote.customerContactHandle}
                    </p>
                  </div>
                </div>
              </div>

              {/* --- Send with Requo option --- */}
              {showRequoOption ? (
                <form ref={formRef} action={formAction}>
                  <button
                    aria-hidden="true"
                    className="hidden"
                    disabled={disabled || isPending}
                    name="deliveryMethod"
                    ref={reqSubmitRef}
                    tabIndex={-1}
                    type="submit"
                    value="requo"
                  />
                  <button
                    aria-hidden="true"
                    className="hidden"
                    disabled={disabled || isPending}
                    name="deliveryMethod"
                    ref={manSubmitRef}
                    tabIndex={-1}
                    type="submit"
                    value="manual"
                  />

                  <div className="flex flex-col gap-3">
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

                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-border" />
                      <span className="meta-label">or send yourself</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  </div>
                </form>
              ) : (
                <form ref={formRef} action={formAction} className="hidden">
                  <button
                    aria-hidden="true"
                    className="hidden"
                    disabled={disabled || isPending}
                    name="deliveryMethod"
                    ref={manSubmitRef}
                    tabIndex={-1}
                    type="submit"
                    value="manual"
                  />
                </form>
              )}

              {/* --- Message preview --- */}
              <div className="flex flex-col gap-2">
                <p className="meta-label">Message preview</p>
                <div className="relative">
                  <textarea
                    className="w-full resize-none rounded-lg border border-input bg-muted/40 p-3 pr-10 text-sm leading-relaxed text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    onChange={(e) => setEditedMessage(e.target.value)}
                    rows={4}
                    value={editedMessage}
                  />
                  <Button
                    className="absolute right-2 top-2"
                    onClick={handleCopyMessage}
                    size="icon-xs"
                    title="Copy message"
                    type="button"
                    variant="ghost"
                  >
                    {copiedField === "Message" ? (
                      <Check className="size-3.5" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              {/* --- Primary channel action --- */}
              <div className="flex flex-col gap-2">
                {channelAction.variant === "email" && mailtoUrl ? (
                  <Button
                    asChild
                    className="w-full"
                    onClick={handleOpenEmailApp}
                    variant="outline"
                  >
                    <a href={mailtoUrl} target="_blank" rel="noopener noreferrer">
                      <Mail data-icon="inline-start" />
                      Open in Email App
                      <ExternalLink data-icon="inline-end" className="size-3.5" />
                    </a>
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={handleCopyMessage}
                    type="button"
                    variant="outline"
                  >
                    {copiedField === "Message" ? (
                      <Check data-icon="inline-start" />
                    ) : (
                      <Copy data-icon="inline-start" />
                    )}
                    {copiedField === "Message"
                      ? "Copied!"
                      : channelAction.label}
                  </Button>
                )}
              </div>

              {/* --- Secondary actions --- */}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleCopyLink}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  {copiedField === "Quote link" ? (
                    <Check data-icon="inline-start" className="size-3.5" />
                  ) : (
                    <Copy data-icon="inline-start" className="size-3.5" />
                  )}
                  {copiedField === "Quote link" ? "Copied!" : "Copy link"}
                </Button>

                <Button
                  onClick={handleCopyFollowUp}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <Copy data-icon="inline-start" className="size-3.5" />
                  Copy follow-up
                </Button>

                {pdfExportHref ? (
                  <Button asChild size="sm" variant="ghost">
                    <a href={pdfExportHref} target="_blank" rel="noopener noreferrer">
                      <ExternalLink data-icon="inline-start" className="size-3.5" />
                      Download PDF
                    </a>
                  </Button>
                ) : pdfExportLocked ? (
                  <ProFeatureNoticeButton
                    noticeDescription="Upgrade to Pro to download quote PDFs before sending."
                    noticeTitle="PDF export is a Pro feature."
                    size="sm"
                    variant="ghost"
                  >
                    <ExternalLink data-icon="inline-start" className="size-3.5" />
                    Download PDF
                  </ProFeatureNoticeButton>
                ) : null}
              </div>

              {/* --- Email disclaimer --- */}
              {isEmailContact && mailtoUrl ? (
                <p className="text-xs leading-5 text-muted-foreground">
                  Your email app controls which account sends this. Check the
                  From address before sending.
                </p>
              ) : null}
            </DialogBody>

            {/* --- Mark as Sent footer --- */}
            <DialogFooter className="flex-col gap-3 sm:flex-col">
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                <span className="text-sm text-muted-foreground">Via</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" type="button" variant="outline">
                      {getSendChannelLabel(selectedChannel)}
                      <ChevronDown data-icon="inline-end" className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40">
                    <DropdownMenuGroup>
                      {quoteSendChannels.map((ch) => (
                        <DropdownMenuItem
                          key={ch}
                          onSelect={() => setSelectedChannel(ch)}
                        >
                          {quoteSendChannelLabels[ch]}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                {showMarkSentConfirm ? (
                  <div className="flex flex-1 items-center gap-2">
                    <span className="text-sm text-muted-foreground">Mark this quote as sent?</span>
                    <Button
                      onClick={confirmMarkAsSent}
                      size="sm"
                      type="button"
                    >
                      Confirm
                    </Button>
                    <Button
                      onClick={() => setShowMarkSentConfirm(false)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="flex-1"
                    disabled={disabled || isPending}
                    onClick={handleMarkAsSent}
                    type="button"
                  >
                    {isPending ? (
                      <Spinner data-icon="inline-start" aria-hidden="true" />
                    ) : (
                      <Check data-icon="inline-start" />
                    )}
                    {isPending ? "Marking sent..." : "Mark as Sent"}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </>
        ) : (
          /* --- Sent confirmation step --- */
          <>
            <DialogHeader>
              <DialogTitle>Quote sent</DialogTitle>
              <DialogDescription>
                {sendState?.success ??
                  `Quote ${quote.quoteNumber} marked as sent.`}
              </DialogDescription>
            </DialogHeader>

            <DialogBody className="flex flex-col gap-5">
              <div className="soft-panel flex flex-col gap-3 px-4 py-4 shadow-none">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
                    <Check className="size-4 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    Quote {quote.quoteNumber} is now in the sent stage
                  </p>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  Requo will track when the customer views, accepts, or
                  declines the quote. Set a follow-up reminder if you want this
                  quote to stay on your radar.
                </p>
              </div>

              {createFollowUpAction ? (
                <QuoteFollowUpPrompt
                  action={createFollowUpAction}
                  onCopyFollowUp={handleCopyFollowUp}
                  quote={quote}
                  selectedChannel={selectedChannel}
                />
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-foreground">
                    Quick follow-up
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Need to send a follow-up later? Copy a ready-made message
                    anytime.
                  </p>
                  <Button
                    className="mt-1 w-full sm:w-auto"
                    onClick={handleCopyFollowUp}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Copy data-icon="inline-start" className="size-3.5" />
                    Copy follow-up message
                  </Button>
                </div>
              )}
            </DialogBody>

            <DialogFooter>
              <Button onClick={() => setOpen(false)} type="button">
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

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
      <div className="soft-panel flex flex-col gap-3 px-4 py-4 shadow-none">
        <div className="flex items-center gap-2">
          <BellRing className="size-4 text-primary" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">
            Follow-up reminder set
          </p>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          It will appear in your dashboard follow-ups list.
        </p>
      </div>
    );
  }

  if (dismissed) {
    return (
      <div className="soft-panel flex flex-col gap-3 px-4 py-4 shadow-none">
        <p className="text-sm font-medium text-foreground">
          Follow-up reminder skipped
        </p>
        <p className="text-sm leading-6 text-muted-foreground">
          You can still create one later from the quote detail page.
        </p>
      </div>
    );
  }

  function HiddenFields({ dueDate }: { dueDate: string }) {
    return (
      <>
        <input name="title" type="hidden" value={followUpTitle} />
        <input name="reason" type="hidden" value={followUpReason} />
        <input name="channel" type="hidden" value={followUpChannel} />
        <input name="dueDate" type="hidden" value={dueDate} />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium text-foreground">
          Set follow-up reminder?
        </p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Choose when this quote should come back to your attention. Requo will
          not send anything automatically.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["tomorrow", "Tomorrow"],
          ["3d", "In 3 days"],
          ["7d", "In 7 days"],
        ].map(([value, label]) => (
          <form action={formAction} key={value}>
            <HiddenFields
              dueDate={getQuickFollowUpDueDate(value as "tomorrow" | "3d" | "7d")}
            />
            <Button disabled={isPending} size="sm" type="submit" variant="outline">
              {isPending ? null : <BellRing data-icon="inline-start" />}
              {label}
            </Button>
          </form>
        ))}
        <Button
          onClick={() => setCustomOpen((value) => !value)}
          size="sm"
          type="button"
          variant="outline"
        >
          Custom date
        </Button>
        <Button
          onClick={() => setDismissed(true)}
          size="sm"
          type="button"
          variant="ghost"
        >
          Skip
        </Button>
      </div>

      {customOpen ? (
        <form action={formAction} className="rounded-lg border border-border/70 p-3">
          <input name="title" type="hidden" value={followUpTitle} />
          <input name="reason" type="hidden" value={followUpReason} />
          <input name="channel" type="hidden" value={followUpChannel} />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <p className="meta-label mb-2">Custom due date</p>
              <DatePicker
                id="quote-follow-up-custom-date"
                name="dueDate"
                onChange={setCustomDueDate}
                required
                value={customDueDate}
              />
            </div>
            <Button disabled={isPending} type="submit">
              {isPending ? (
                <Spinner data-icon="inline-start" aria-hidden="true" />
              ) : (
                <BellRing data-icon="inline-start" />
              )}
              Save reminder
            </Button>
          </div>
        </form>
      ) : null}

      <Button
        className="w-full sm:w-fit"
        onClick={onCopyFollowUp}
        size="sm"
        type="button"
        variant="ghost"
      >
        <Copy data-icon="inline-start" className="size-3.5" />
        Copy follow-up message
      </Button>
    </div>
  );
}
