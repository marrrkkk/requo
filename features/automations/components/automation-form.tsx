"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { FormSection } from "@/components/shared/form-layout";

import { createAutomation, updateAutomation } from "../mutations";
import {
  type ActionConfig,
  type ActionType,
  type Condition,
  type ConditionOperator,
  type DelayConfig,
  type DelayUnit,
  type TriggerType,
  actionTypes,
  conditionOperators,
  createAutomationSchema,
  delayUnits,
  triggerTypes,
} from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AutomationFormData = {
  id?: string;
  name: string;
  description: string;
  triggerType: TriggerType | "";
  conditions: Condition[];
  actions: ActionConfig[];
  delay: DelayConfig | null;
  enabled: boolean;
};

type AutomationFormProps = {
  mode: "create" | "edit";
  automationId?: string;
  defaultValues?: Partial<AutomationFormData>;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

// ---------------------------------------------------------------------------
// Label Maps
// ---------------------------------------------------------------------------

const triggerLabels: Record<string, string> = {
  "inquiry.received": "Inquiry received",
  "inquiry.qualified": "Inquiry qualified",
  "inquiry.archived": "Inquiry archived",
  "quote.created": "Quote created",
  "quote.sent": "Quote sent",
  "quote.viewed": "Quote viewed",
  "quote.accepted": "Quote accepted",
  "quote.rejected": "Quote rejected",
  "quote.expired": "Quote expired",
  "job.created": "Job created",
  "job.completed": "Job completed",
  "invoice.sent": "Invoice sent",
  "invoice.paid": "Invoice paid",
  "invoice.overdue": "Invoice overdue",
  "follow_up.due": "Follow-up due",
  "follow_up.overdue": "Follow-up overdue",
};

const actionTypeLabels: Record<ActionType, string> = {
  create_follow_up: "Create follow-up",
  send_notification: "Send notification",
  send_email: "Send email",
  update_inquiry_status: "Update inquiry status",
  update_quote_status: "Update quote status",
  archive_inquiry: "Archive inquiry",
  create_job_from_quote: "Create job from quote",
  generate_invoice: "Generate invoice",
  generate_draft_quote: "Generate draft quote",
};

const operatorLabels: Record<ConditionOperator, string> = {
  eq: "Equals",
  neq: "Not equals",
  gt: "Greater than",
  gte: "Greater or equal",
  lt: "Less than",
  lte: "Less or equal",
  contains: "Contains",
  not_contains: "Does not contain",
};

// ---------------------------------------------------------------------------
// Option Data
// ---------------------------------------------------------------------------

const triggerOptions = triggerTypes.map((t) => ({
  value: t,
  label: triggerLabels[t],
}));

const actionTypeOptions = actionTypes.map((t) => ({
  value: t,
  label: actionTypeLabels[t],
}));

const operatorOptions = conditionOperators.map((op) => ({
  value: op,
  label: operatorLabels[op],
}));

const delayUnitOptions = delayUnits.map((u) => ({
  value: u,
  label: u.charAt(0).toUpperCase() + u.slice(1),
}));

// ---------------------------------------------------------------------------
// Default Action Configs
// ---------------------------------------------------------------------------

function getDefaultActionConfig(type: ActionType): ActionConfig {
  switch (type) {
    case "create_follow_up":
      return { type, title: "", reason: "", channel: "email", dueDateOffsetDays: 3 };
    case "send_notification":
      return { type, title: "", body: "" };
    case "send_email":
      return { type, subject: "", body: "" };
    case "update_inquiry_status":
      return { type, status: "" };
    case "update_quote_status":
      return { type, status: "" };
    case "archive_inquiry":
      return { type, reason: "" };
    case "create_job_from_quote":
      return { type };
    case "generate_invoice":
      return { type, dueOffsetDays: 14 };
    case "generate_draft_quote":
      return { type, useAi: true };
  }
}

// ---------------------------------------------------------------------------
// Form Defaults
// ---------------------------------------------------------------------------

function getInitialFormData(
  defaultValues?: Partial<AutomationFormData>,
): AutomationFormData {
  return {
    name: defaultValues?.name ?? "",
    description: defaultValues?.description ?? "",
    triggerType: defaultValues?.triggerType ?? "",
    conditions: defaultValues?.conditions ?? [],
    actions: defaultValues?.actions ?? [],
    delay: defaultValues?.delay ?? null,
    enabled: defaultValues?.enabled ?? true,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AutomationForm({
  mode,
  automationId,
  defaultValues,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AutomationFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const [form, setForm] = useState<AutomationFormData>(() =>
    getInitialFormData(defaultValues),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setForm(getInitialFormData(defaultValues));
    setErrors({});
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      resetForm();
    }
    setOpen(nextOpen);
  }

  function updateField<K extends keyof AutomationFormData>(
    key: K,
    value: AutomationFormData[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function handleSubmit() {
    // Build input
    const input: Record<string, unknown> = {
      name: form.name,
      description: form.description || undefined,
      triggerType: form.triggerType || undefined,
      conditions: form.conditions.length > 0 ? form.conditions : undefined,
      actions: form.actions.length > 0 ? form.actions : undefined,
      delay: form.delay ?? undefined,
      enabled: form.enabled,
      priority: 0,
    };

    // Validate with Zod
    const result = createAutomationSchema.safeParse(input);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join(".");
        if (!fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    startTransition(async () => {
      const response =
        mode === "edit" && automationId
          ? await updateAutomation(automationId, result.data)
          : await createAutomation(result.data);

      if (response.error) {
        toast.error(response.error);
        return;
      }

      toast.success(
        response.success ?? (mode === "edit" ? "Automation updated." : "Automation created."),
      );
      setOpen(false);
    });
  }

  const defaultTrigger = (
    <Button size="sm">
      <Plus data-icon="inline-start" />
      {mode === "edit" ? "Edit automation" : "New automation"}
    </Button>
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      {trigger !== undefined ? (
        <SheetTrigger asChild>{trigger}</SheetTrigger>
      ) : (
        <SheetTrigger asChild>{defaultTrigger}</SheetTrigger>
      )}
      <SheetContent side="right" className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {mode === "edit" ? "Edit automation" : "Create automation"}
          </SheetTitle>
          <SheetDescription>
            {mode === "edit"
              ? "Update trigger, conditions, actions, and timing."
              : "Set up an event-driven rule to automate your workflow."}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="flex flex-col gap-6 overflow-y-auto">
          {/* --- Basic Info --- */}
          <FormSection title="Details">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="automation-name">Name</FieldLabel>
                <FieldContent>
                  <Input
                    id="automation-name"
                    placeholder="e.g. Follow up after quote sent"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    aria-invalid={!!errors.name}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name}</p>
                  )}
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="automation-description">
                  Description
                  <Badge variant="secondary" className="ml-1.5 text-[0.65rem]">
                    Optional
                  </Badge>
                </FieldLabel>
                <FieldContent>
                  <Textarea
                    id="automation-description"
                    placeholder="What does this automation do?"
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    rows={2}
                  />
                </FieldContent>
              </Field>

              <Field orientation="horizontal">
                <FieldLabel htmlFor="automation-enabled">Enabled</FieldLabel>
                <Switch
                  id="automation-enabled"
                  checked={form.enabled}
                  onCheckedChange={(checked) => updateField("enabled", checked)}
                />
              </Field>
            </FieldGroup>
          </FormSection>

          {/* --- Trigger --- */}
          <FormSection title="Trigger" description="Which event starts this automation?">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="automation-trigger">Event</FieldLabel>
                <FieldContent>
                  <Combobox
                    id="automation-trigger"
                    placeholder="Select a trigger event"
                    options={triggerOptions}
                    value={form.triggerType}
                    onValueChange={(v) => updateField("triggerType", v as TriggerType)}
                    searchable
                    searchPlaceholder="Search triggers"
                    aria-invalid={!!errors.triggerType}
                  />
                  {errors.triggerType && (
                    <p className="text-xs text-destructive">{errors.triggerType}</p>
                  )}
                </FieldContent>
              </Field>
            </FieldGroup>
          </FormSection>

          {/* --- Conditions --- */}
          <FormSection
            title="Conditions"
            description="Optional filters applied before actions run."
            action={
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  updateField("conditions", [
                    ...form.conditions,
                    { field: "", operator: "eq", value: "" },
                  ])
                }
              >
                <Plus data-icon="inline-start" />
                Add
              </Button>
            }
          >
            {form.conditions.length > 0 ? (
              <div className="flex flex-col gap-3">
                {form.conditions.map((condition, idx) => (
                  <ConditionRow
                    key={idx}
                    condition={condition}
                    index={idx}
                    error={errors[`conditions.${idx}.field`]}
                    onChange={(updated) => {
                      const next = [...form.conditions];
                      next[idx] = updated;
                      updateField("conditions", next);
                    }}
                    onRemove={() => {
                      const next = form.conditions.filter((_, i) => i !== idx);
                      updateField("conditions", next);
                    }}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No conditions — actions will run for every trigger event.
              </p>
            )}
          </FormSection>

          {/* --- Actions --- */}
          <FormSection
            title="Actions"
            description="What should happen when the trigger fires?"
            action={
              form.actions.length === 0 ? null : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    updateField("actions", [
                      ...form.actions,
                      getDefaultActionConfig("send_notification"),
                    ]);
                  }}
                >
                  <Plus data-icon="inline-start" />
                  Add
                </Button>
              )
            }
          >
            {form.actions.length > 0 ? (
              <div className="flex flex-col gap-4">
                {form.actions.map((action, idx) => (
                  <ActionRow
                    key={idx}
                    action={action}
                    index={idx}
                    errors={errors}
                    onChange={(updated) => {
                      const next = [...form.actions];
                      next[idx] = updated;
                      updateField("actions", next);
                    }}
                    onRemove={() => {
                      const next = form.actions.filter((_, i) => i !== idx);
                      updateField("actions", next);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/70 px-4 py-6">
                <Zap className="size-5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Add at least one action.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    updateField("actions", [
                      getDefaultActionConfig("send_notification"),
                    ]);
                  }}
                >
                  <Plus data-icon="inline-start" />
                  Add action
                </Button>
                {errors.actions && (
                  <p className="text-xs text-destructive">{errors.actions}</p>
                )}
              </div>
            )}
          </FormSection>

          {/* --- Delay --- */}
          <FormSection
            title="Delay"
            description="Wait before executing actions."
          >
            <FieldGroup>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="automation-delay-toggle">
                  Add delay
                </FieldLabel>
                <Switch
                  id="automation-delay-toggle"
                  checked={form.delay !== null}
                  onCheckedChange={(checked) => {
                    updateField(
                      "delay",
                      checked ? { unit: "days", value: 3 } : null,
                    );
                  }}
                />
              </Field>

              {form.delay && (
                <div className="flex items-end gap-3">
                  <Field className="flex-1">
                    <FieldLabel htmlFor="automation-delay-value">
                      Duration
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id="automation-delay-value"
                        type="number"
                        min={1}
                        value={form.delay.value}
                        onChange={(e) =>
                          updateField("delay", {
                            ...form.delay!,
                            value: Number(e.target.value) || 1,
                          })
                        }
                        aria-invalid={!!errors["delay.value"]}
                      />
                      {errors["delay.value"] && (
                        <p className="text-xs text-destructive">
                          {errors["delay.value"]}
                        </p>
                      )}
                    </FieldContent>
                  </Field>
                  <Field className="flex-1">
                    <FieldLabel htmlFor="automation-delay-unit">Unit</FieldLabel>
                    <FieldContent>
                      <Combobox
                        id="automation-delay-unit"
                        placeholder="Unit"
                        options={delayUnitOptions}
                        value={form.delay.unit}
                        onValueChange={(v) =>
                          updateField("delay", {
                            ...form.delay!,
                            unit: v as DelayUnit,
                          })
                        }
                      />
                    </FieldContent>
                  </Field>
                </div>
              )}
            </FieldGroup>
          </FormSection>
        </SheetBody>

        <SheetFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending
              ? mode === "edit"
                ? "Saving…"
                : "Creating…"
              : mode === "edit"
                ? "Save changes"
                : "Create automation"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Condition Row
// ---------------------------------------------------------------------------

function ConditionRow({
  condition,
  index,
  error,
  onChange,
  onRemove,
}: {
  condition: Condition;
  index: number;
  error?: string;
  onChange: (updated: Condition) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="grid flex-1 gap-2 sm:grid-cols-3">
        <Input
          placeholder="Field path"
          value={condition.field}
          onChange={(e) => onChange({ ...condition, field: e.target.value })}
          aria-label={`Condition ${index + 1} field`}
          aria-invalid={!!error}
        />
        <Combobox
          id={`condition-op-${index}`}
          placeholder="Operator"
          options={operatorOptions}
          value={condition.operator}
          onValueChange={(v) =>
            onChange({ ...condition, operator: v as ConditionOperator })
          }
        />
        <Input
          placeholder="Value"
          value={String(condition.value)}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
          aria-label={`Condition ${index + 1} value`}
        />
      </div>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={onRemove}
        aria-label={`Remove condition ${index + 1}`}
        className="shrink-0 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="size-3.5" />
      </Button>
      {error && (
        <p className="col-span-full text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Action Row
// ---------------------------------------------------------------------------

function ActionRow({
  action,
  index,
  errors,
  onChange,
  onRemove,
}: {
  action: ActionConfig;
  index: number;
  errors: Record<string, string>;
  onChange: (updated: ActionConfig) => void;
  onRemove: () => void;
}) {
  function handleTypeChange(newType: string) {
    onChange(getDefaultActionConfig(newType as ActionType));
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          <Combobox
            id={`action-type-${index}`}
            placeholder="Action type"
            options={actionTypeOptions}
            value={action.type}
            onValueChange={handleTypeChange}
          />
        </div>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onRemove}
          aria-label={`Remove action ${index + 1}`}
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <ActionConfigFields
        action={action}
        index={index}
        errors={errors}
        onChange={onChange}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Action Config Fields (per type)
// ---------------------------------------------------------------------------

function ActionConfigFields({
  action,
  index,
  errors,
  onChange,
}: {
  action: ActionConfig;
  index: number;
  errors: Record<string, string>;
  onChange: (updated: ActionConfig) => void;
}) {
  const prefix = `actions.${index}`;

  switch (action.type) {
    case "create_follow_up":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            placeholder="Follow-up title"
            value={action.title}
            onChange={(e) => onChange({ ...action, title: e.target.value })}
            aria-invalid={!!errors[`${prefix}.title`]}
          />
          <Input
            placeholder="Reason"
            value={action.reason}
            onChange={(e) => onChange({ ...action, reason: e.target.value })}
            aria-invalid={!!errors[`${prefix}.reason`]}
          />
          <Input
            placeholder="Due offset (days)"
            type="number"
            min={1}
            value={action.dueDateOffsetDays}
            onChange={(e) =>
              onChange({ ...action, dueDateOffsetDays: Number(e.target.value) || 1 })
            }
          />
          <Combobox
            id={`action-channel-${index}`}
            placeholder="Channel"
            options={[
              { value: "email", label: "Email" },
              { value: "phone", label: "Phone" },
              { value: "sms", label: "SMS" },
              { value: "other", label: "Other" },
            ]}
            value={action.channel}
            onValueChange={(v) =>
              onChange({ ...action, channel: v as "email" | "phone" | "sms" | "other" })
            }
          />
        </div>
      );

    case "send_notification":
      return (
        <div className="flex flex-col gap-2">
          <Input
            placeholder="Notification title"
            value={action.title}
            onChange={(e) => onChange({ ...action, title: e.target.value })}
            aria-invalid={!!errors[`${prefix}.title`]}
          />
          <Input
            placeholder="Body (optional)"
            value={action.body ?? ""}
            onChange={(e) => onChange({ ...action, body: e.target.value })}
          />
        </div>
      );

    case "send_email":
      return (
        <div className="flex flex-col gap-2">
          <Input
            placeholder="Subject"
            value={action.subject}
            onChange={(e) => onChange({ ...action, subject: e.target.value })}
            aria-invalid={!!errors[`${prefix}.subject`]}
          />
          <Textarea
            placeholder="Email body"
            value={action.body}
            onChange={(e) => onChange({ ...action, body: e.target.value })}
            rows={3}
            aria-invalid={!!errors[`${prefix}.body`]}
          />
          <Input
            placeholder="Recipient email (optional, defaults to customer)"
            value={action.recipientEmail ?? ""}
            onChange={(e) =>
              onChange({ ...action, recipientEmail: e.target.value || undefined })
            }
          />
        </div>
      );

    case "update_inquiry_status":
      return (
        <Input
          placeholder="Target status"
          value={action.status}
          onChange={(e) => onChange({ ...action, status: e.target.value })}
          aria-invalid={!!errors[`${prefix}.status`]}
        />
      );

    case "update_quote_status":
      return (
        <Input
          placeholder="Target status (e.g. expired)"
          value={action.status}
          onChange={(e) => onChange({ ...action, status: e.target.value })}
          aria-invalid={!!errors[`${prefix}.status`]}
        />
      );

    case "archive_inquiry":
      return (
        <Input
          placeholder="Archive reason (optional)"
          value={action.reason ?? ""}
          onChange={(e) => onChange({ ...action, reason: e.target.value })}
        />
      );

    case "create_job_from_quote":
      return (
        <Input
          placeholder="Job title (optional, defaults to quote title)"
          value={action.title ?? ""}
          onChange={(e) =>
            onChange({ ...action, title: e.target.value || undefined })
          }
        />
      );

    case "generate_invoice":
      return (
        <Input
          placeholder="Payment due offset (days)"
          type="number"
          min={1}
          value={action.dueOffsetDays}
          onChange={(e) =>
            onChange({ ...action, dueOffsetDays: Number(e.target.value) || 14 })
          }
        />
      );

    case "generate_draft_quote":
      return (
        <Field orientation="horizontal">
          <FieldLabel htmlFor={`action-ai-${index}`}>Use AI generation</FieldLabel>
          <Switch
            id={`action-ai-${index}`}
            checked={action.useAi}
            onCheckedChange={(checked) => onChange({ ...action, useAi: checked })}
          />
        </Field>
      );

    default:
      return null;
  }
}
