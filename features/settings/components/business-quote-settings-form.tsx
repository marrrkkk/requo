"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";

import {
  FloatingFormActions,
  useFloatingUnsavedChanges,
} from "@/components/shared/floating-form-actions";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useDeferredRefresh } from "@/hooks/use-deferred-refresh";
import type {
  BusinessQuoteSettingsActionState,
  BusinessSettingsView,
} from "@/features/settings/types";

type BusinessQuoteSettingsFormProps = {
  action: (
    state: BusinessQuoteSettingsActionState,
    formData: FormData,
  ) => Promise<BusinessQuoteSettingsActionState>;
  settings: BusinessSettingsView;
};

const initialState: BusinessQuoteSettingsActionState = {};

export function BusinessQuoteSettingsForm({
  action,
  settings,
}: BusinessQuoteSettingsFormProps) {
  const { scheduleRefresh } = useDeferredRefresh();
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    initialState,
  );
  const [defaultQuoteValidityDays, setDefaultQuoteValidityDays] = useState(
    String(settings.defaultQuoteValidityDays),
  );
  const [defaultQuoteNotes, setDefaultQuoteNotes] = useState(
    settings.defaultQuoteNotes ?? "",
  );
  const [defaultQuoteTerms, setDefaultQuoteTerms] = useState(
    settings.defaultQuoteTerms ?? "",
  );
  const [sendInquiryAckEmail, setSendInquiryAckEmail] = useState(
    settings.sendInquiryAckEmail,
  );
  const [autoDraftQuoteOnQualify, setAutoDraftQuoteOnQualify] = useState(
    settings.autoDraftQuoteOnQualify,
  );
  const [autoArchiveStaleInquiries, setAutoArchiveStaleInquiries] = useState(
    settings.autoArchiveStaleInquiries,
  );
  const [autoArchiveStaleInquiryDays, setAutoArchiveStaleInquiryDays] =
    useState(String(settings.autoArchiveStaleInquiryDays));
  const [autoFollowUpOnQuoteViewed, setAutoFollowUpOnQuoteViewed] = useState(
    settings.autoFollowUpOnQuoteViewed,
  );
  const [quoteViewedFollowUpDelayDays, setQuoteViewedFollowUpDelayDays] =
    useState(String(settings.quoteViewedFollowUpDelayDays));
  const hasUnsavedChanges =
    defaultQuoteValidityDays !== String(settings.defaultQuoteValidityDays) ||
    defaultQuoteNotes !== (settings.defaultQuoteNotes ?? "") ||
    defaultQuoteTerms !== (settings.defaultQuoteTerms ?? "") ||
    sendInquiryAckEmail !== settings.sendInquiryAckEmail ||
    autoDraftQuoteOnQualify !== settings.autoDraftQuoteOnQualify ||
    autoArchiveStaleInquiries !== settings.autoArchiveStaleInquiries ||
    autoArchiveStaleInquiryDays !==
      String(settings.autoArchiveStaleInquiryDays) ||
    autoFollowUpOnQuoteViewed !== settings.autoFollowUpOnQuoteViewed ||
    quoteViewedFollowUpDelayDays !==
      String(settings.quoteViewedFollowUpDelayDays);
  const { shouldRenderFloatingActions, floatingActionsState } =
    useFloatingUnsavedChanges(hasUnsavedChanges);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    scheduleRefresh();
  }, [scheduleRefresh, state.success]);

  function handleCancelChanges() {
    setDefaultQuoteValidityDays(String(settings.defaultQuoteValidityDays));
    setDefaultQuoteNotes(settings.defaultQuoteNotes ?? "");
    setDefaultQuoteTerms(settings.defaultQuoteTerms ?? "");
    setSendInquiryAckEmail(settings.sendInquiryAckEmail);
    setAutoDraftQuoteOnQualify(settings.autoDraftQuoteOnQualify);
    setAutoArchiveStaleInquiries(settings.autoArchiveStaleInquiries);
    setAutoArchiveStaleInquiryDays(String(settings.autoArchiveStaleInquiryDays));
    setAutoFollowUpOnQuoteViewed(settings.autoFollowUpOnQuoteViewed);
    setQuoteViewedFollowUpDelayDays(
      String(settings.quoteViewedFollowUpDelayDays),
    );
  }

  return (
    <form action={formAction} className="form-stack pb-28">
      <div className="flex flex-col gap-6">
        {/* Info notice */}
        <div className="flex items-start gap-3 rounded-xl border border-border/75 bg-muted/30 px-5 py-4">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            These defaults apply to new quotes only. Existing quotes keep their
            stored values.
          </p>
        </div>

        {/* Settings fields */}
        <section className="section-panel p-5 sm:p-6">
          <div className="flex flex-col gap-6">
            <Field
              data-invalid={
                Boolean(state.fieldErrors?.defaultQuoteValidityDays) || undefined
              }
            >
              <FieldLabel htmlFor="quote-settings-validity-days">
                Default validity period
              </FieldLabel>
              <FieldContent>
                <div className="flex items-center gap-3">
                  <Input
                    className="w-24"
                    disabled={isPending}
                    id="quote-settings-validity-days"
                    inputMode="numeric"
                    max="365"
                    min="1"
                    name="defaultQuoteValidityDays"
                    onChange={(event) =>
                      setDefaultQuoteValidityDays(event.currentTarget.value)
                    }
                    required
                    step="1"
                    type="number"
                    value={defaultQuoteValidityDays}
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
                <FieldDescription>
                  How long new quotes stay valid before expiring (1–365 days).
                </FieldDescription>
                <FieldError
                  errors={
                    state.fieldErrors?.defaultQuoteValidityDays?.[0]
                      ? [{ message: state.fieldErrors.defaultQuoteValidityDays[0] }]
                      : undefined
                  }
                />
              </FieldContent>
            </Field>

            <div className="border-t border-border" />

            <Field data-invalid={Boolean(state.fieldErrors?.defaultQuoteNotes) || undefined}>
              <FieldLabel htmlFor="quote-settings-default-notes">
                Default quote notes
              </FieldLabel>
              <FieldContent>
                <Textarea
                  disabled={isPending}
                  id="quote-settings-default-notes"
                  maxLength={1600}
                  name="defaultQuoteNotes"
                  onChange={(event) => setDefaultQuoteNotes(event.currentTarget.value)}
                  placeholder="e.g., Delivery timeline, scope assumptions, or next steps..."
                  rows={6}
                  value={defaultQuoteNotes}
                />
                <FieldDescription>
                  Automatically added to the notes section of every new quote.
                  Customers see this on the public quote page.
                </FieldDescription>
                <FieldError
                  errors={
                    state.fieldErrors?.defaultQuoteNotes?.[0]
                      ? [{ message: state.fieldErrors.defaultQuoteNotes[0] }]
                      : undefined
                  }
                />
              </FieldContent>
            </Field>

            <div className="border-t border-border" />

            <Field data-invalid={Boolean(state.fieldErrors?.defaultQuoteTerms) || undefined}>
              <FieldLabel htmlFor="quote-settings-default-terms">
                Default terms & conditions
              </FieldLabel>
              <FieldContent>
                <Textarea
                  disabled={isPending}
                  id="quote-settings-default-terms"
                  maxLength={4000}
                  name="defaultQuoteTerms"
                  onChange={(event) => setDefaultQuoteTerms(event.currentTarget.value)}
                  placeholder="e.g., Payment due within 30 days. 50% deposit required to begin work. Cancellation policy applies."
                  rows={6}
                  value={defaultQuoteTerms}
                />
                <FieldDescription>
                  Automatically included in the terms section of every new quote.
                  Displayed below line items on the public quote page.
                </FieldDescription>
                <FieldError
                  errors={
                    state.fieldErrors?.defaultQuoteTerms?.[0]
                      ? [{ message: state.fieldErrors.defaultQuoteTerms[0] }]
                      : undefined
                  }
                />
              </FieldContent>
            </Field>
          </div>
        </section>

        {/* Workflow defaults */}
        <section className="section-panel p-5 sm:p-6">
          <div className="flex flex-col gap-6">
            <Field>
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <FieldLabel htmlFor="quote-settings-ack-email">
                    Inquiry acknowledgment email
                  </FieldLabel>
                  <FieldDescription>
                    Send customers a confirmation email when they submit an
                    inquiry.
                  </FieldDescription>
                </div>
                <Switch
                  checked={sendInquiryAckEmail}
                  disabled={isPending}
                  id="quote-settings-ack-email"
                  onCheckedChange={setSendInquiryAckEmail}
                />
              </div>
              <input
                name="sendInquiryAckEmail"
                type="hidden"
                value={sendInquiryAckEmail ? "true" : "false"}
              />
            </Field>

            <div className="border-t border-border" />

            <Field>
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <FieldLabel htmlFor="quote-settings-ai-draft">
                    AI draft quote on qualified inquiries
                  </FieldLabel>
                  <FieldDescription>
                    Generate a draft quote automatically when an inquiry is
                    qualified. Subject to the plan&rsquo;s AI usage limits.
                  </FieldDescription>
                </div>
                <Switch
                  checked={autoDraftQuoteOnQualify}
                  disabled={isPending}
                  id="quote-settings-ai-draft"
                  onCheckedChange={setAutoDraftQuoteOnQualify}
                />
              </div>
              <input
                name="autoDraftQuoteOnQualify"
                type="hidden"
                value={autoDraftQuoteOnQualify ? "true" : "false"}
              />
            </Field>

            <div className="border-t border-border" />

            <Field>
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <FieldLabel htmlFor="quote-settings-auto-archive">
                    Auto-archive stale inquiries
                  </FieldLabel>
                  <FieldDescription>
                    Archive open inquiries with no activity after the idle
                    window below.
                  </FieldDescription>
                </div>
                <Switch
                  checked={autoArchiveStaleInquiries}
                  disabled={isPending}
                  id="quote-settings-auto-archive"
                  onCheckedChange={setAutoArchiveStaleInquiries}
                />
              </div>
              <input
                name="autoArchiveStaleInquiries"
                type="hidden"
                value={autoArchiveStaleInquiries ? "true" : "false"}
              />
            </Field>
            <Field
              data-invalid={
                Boolean(state.fieldErrors?.autoArchiveStaleInquiryDays) ||
                undefined
              }
            >
              <FieldLabel htmlFor="quote-settings-auto-archive-days">
                Stale inquiry idle window
              </FieldLabel>
              <FieldContent>
                <div className="flex items-center gap-3">
                  <Input
                    className="w-24"
                    disabled={isPending || !autoArchiveStaleInquiries}
                    id="quote-settings-auto-archive-days"
                    inputMode="numeric"
                    max="365"
                    min="1"
                    name="autoArchiveStaleInquiryDays"
                    onChange={(event) =>
                      setAutoArchiveStaleInquiryDays(event.currentTarget.value)
                    }
                    required
                    step="1"
                    type="number"
                    value={autoArchiveStaleInquiryDays}
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
                <FieldDescription>
                  Inquiries are archived when they receive no activity for this
                  many days (1&ndash;365).
                </FieldDescription>
                <FieldError
                  errors={
                    state.fieldErrors?.autoArchiveStaleInquiryDays?.[0]
                      ? [
                          {
                            message:
                              state.fieldErrors.autoArchiveStaleInquiryDays[0],
                          },
                        ]
                      : undefined
                  }
                />
              </FieldContent>
            </Field>

            <div className="border-t border-border" />

            <Field>
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <FieldLabel htmlFor="quote-settings-viewed-follow-up">
                    Follow up on viewed quotes
                  </FieldLabel>
                  <FieldDescription>
                    Create a follow-up task when a customer views a quote but
                    hasn&rsquo;t responded after the delay below.
                  </FieldDescription>
                </div>
                <Switch
                  checked={autoFollowUpOnQuoteViewed}
                  disabled={isPending}
                  id="quote-settings-viewed-follow-up"
                  onCheckedChange={setAutoFollowUpOnQuoteViewed}
                />
              </div>
              <input
                name="autoFollowUpOnQuoteViewed"
                type="hidden"
                value={autoFollowUpOnQuoteViewed ? "true" : "false"}
              />
            </Field>
            <Field
              data-invalid={
                Boolean(state.fieldErrors?.quoteViewedFollowUpDelayDays) ||
                undefined
              }
            >
              <FieldLabel htmlFor="quote-settings-viewed-follow-up-days">
                Follow-up delay after view
              </FieldLabel>
              <FieldContent>
                <div className="flex items-center gap-3">
                  <Input
                    className="w-24"
                    disabled={isPending || !autoFollowUpOnQuoteViewed}
                    id="quote-settings-viewed-follow-up-days"
                    inputMode="numeric"
                    max="90"
                    min="1"
                    name="quoteViewedFollowUpDelayDays"
                    onChange={(event) =>
                      setQuoteViewedFollowUpDelayDays(event.currentTarget.value)
                    }
                    required
                    step="1"
                    type="number"
                    value={quoteViewedFollowUpDelayDays}
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
                <FieldDescription>
                  How long to wait after a quote is viewed before creating the
                  follow-up task (1&ndash;90).
                </FieldDescription>
                <FieldError
                  errors={
                    state.fieldErrors?.quoteViewedFollowUpDelayDays?.[0]
                      ? [
                          {
                            message:
                              state.fieldErrors.quoteViewedFollowUpDelayDays[0],
                          },
                        ]
                      : undefined
                  }
                />
              </FieldContent>
            </Field>
          </div>
        </section>
      </div>

      <FloatingFormActions
        disableSubmit={!hasUnsavedChanges}
        isPending={isPending}
        message="You have unsaved quote settings."
        onCancel={handleCancelChanges}
        state={floatingActionsState}
        submitLabel="Save quote settings"
        submitPendingLabel="Saving..."
        visible={shouldRenderFloatingActions}
      />
    </form>
  );
}
