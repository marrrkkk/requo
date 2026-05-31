"use client";

import { useEffect, useState } from "react";
import { Bot } from "lucide-react";

import { useDeferredRefresh } from "@/hooks/use-deferred-refresh";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import type { InquiryFormConversationalAvatarStyle } from "@/features/inquiries/form-config";
import type { BusinessInquiryFormsActionState } from "@/features/settings/types";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Chatbot Settings Card
//
// Shown in the Fields tab when AI Chat mode is active. Lets the owner
// configure the assistant name, avatar style, and opening message.
// ---------------------------------------------------------------------------

type BusinessInquiryChatbotSettingsCardProps = {
  assistantName: string;
  avatarStyle: InquiryFormConversationalAvatarStyle;
  businessName: string;
  formId: string;
  openingMessage: string;
  saveChatbotSettingsAction: (
    state: BusinessInquiryFormsActionState,
    formData: FormData,
  ) => Promise<BusinessInquiryFormsActionState>;
};

const initialState: BusinessInquiryFormsActionState = {};

export function BusinessInquiryChatbotSettingsCard({
  assistantName,
  avatarStyle,
  businessName,
  formId,
  openingMessage,
  saveChatbotSettingsAction,
}: BusinessInquiryChatbotSettingsCardProps) {
  const { scheduleRefresh } = useDeferredRefresh();
  const [draftName, setDraftName] = useState(assistantName);
  const [draftAvatar, setDraftAvatar] = useState<InquiryFormConversationalAvatarStyle>(avatarStyle);
  const [draftMessage, setDraftMessage] = useState(openingMessage);
  const [saveState, saveAction, isSaving] = useActionStateWithSonner(
    saveChatbotSettingsAction,
    initialState,
  );

  const defaultName = `${businessName} Assistant`;
  const displayName = draftName || defaultName;
  const initial = displayName.charAt(0).toUpperCase();

  const hasChanges =
    draftName !== assistantName ||
    draftAvatar !== avatarStyle ||
    draftMessage !== openingMessage;

  useEffect(() => {
    if (!saveState.success) return;
    scheduleRefresh();
  }, [saveState.success, scheduleRefresh]);

  return (
    <Card className="border-border/75 bg-card/96">
      <CardHeader className="gap-1.5">
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-primary" />
          <CardTitle className="text-base">Chatbot settings</CardTitle>
        </div>
        <CardDescription>
          Customize how the AI assistant appears to customers.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <form
          action={saveAction}
          className="flex flex-col gap-5"
        >
          <input name="targetFormId" type="hidden" value={formId} />

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="chatbot-assistant-name">
                Assistant name
              </FieldLabel>
              <FieldContent>
                <Input
                  id="chatbot-assistant-name"
                  maxLength={60}
                  name="assistantName"
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder={defaultName}
                  value={draftName}
                />
              </FieldContent>
              <FieldDescription>
                The name shown in chat bubbles. Leave empty to use &ldquo;{defaultName}&rdquo;.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel>Avatar style</FieldLabel>
              <FieldContent>
                <input name="avatarStyle" type="hidden" value={draftAvatar} />
                <div className="flex gap-3">
                  <AvatarStyleOption
                    active={draftAvatar === "brand"}
                    label="Brand color"
                    onClick={() => setDraftAvatar("brand")}
                    preview={
                      <div className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Bot className="size-4" />
                      </div>
                    }
                  />
                  <AvatarStyleOption
                    active={draftAvatar === "initials"}
                    label="Initials"
                    onClick={() => setDraftAvatar("initials")}
                    preview={
                      <div className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-sm font-semibold">
                        {initial}
                      </div>
                    }
                  />
                </div>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="chatbot-opening-message">
                Opening message
              </FieldLabel>
              <FieldContent>
                <Textarea
                  className="min-h-[5rem] resize-y"
                  id="chatbot-opening-message"
                  maxLength={500}
                  name="openingMessage"
                  onChange={(e) => setDraftMessage(e.target.value)}
                  placeholder="Hi! I'm here to help you submit an inquiry. What can we help you with?"
                  value={draftMessage}
                />
              </FieldContent>
              <FieldDescription>
                The first message the assistant sends. Leave empty for an AI-generated greeting.
              </FieldDescription>
            </Field>
          </FieldGroup>

          {/* Live preview */}
          <div className="rounded-xl border border-border/60 bg-secondary/30 p-4">
            <p className="mb-2.5 text-xs font-medium text-muted-foreground">
              Preview
            </p>
            <div className="flex items-start gap-2.5">
              {draftAvatar === "brand" ? (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Bot className="size-3.5" />
                </div>
              ) : (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-xs font-semibold">
                  {initial}
                </div>
              )}
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-foreground">
                  {displayName}
                </span>
                <div className="rounded-2xl rounded-tl-md bg-secondary px-3.5 py-2 text-sm text-secondary-foreground">
                  {draftMessage || "Hi! I'm here to help you submit an inquiry. What can we help you with?"}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button disabled={!hasChanges || isSaving} type="submit">
              {isSaving ? <Spinner aria-hidden="true" /> : null}
              Save chatbot settings
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function AvatarStyleOption({
  active,
  label,
  onClick,
  preview,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  preview: React.ReactNode;
}) {
  return (
    <button
      className={cn(
        "flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-colors",
        active
          ? "border-primary bg-primary/[0.04]"
          : "border-border/60 bg-transparent hover:border-primary/40 hover:bg-accent/50",
      )}
      onClick={onClick}
      type="button"
    >
      {preview}
      <span className="text-sm font-medium text-foreground">{label}</span>
    </button>
  );
}
