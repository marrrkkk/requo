"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

import type {
  WorkflowNode,
  WorkflowNodeData,
} from "../hooks/use-workflow-state";
import {
  type ActionType,
  type ConditionOperator,
  type DelayUnit,
  type TriggerType,
  actionTypes,
  conditionOperators,
  delayUnits,
  triggerTypes,
} from "../../../types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type NodeConfigPanelProps = {
  selectedNodeId: string | null;
  nodes: WorkflowNode[];
  onNodeUpdate: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
  onClose: () => void;
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
  label: triggerLabels[t] ?? t,
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
// Component
// ---------------------------------------------------------------------------

export function NodeConfigPanel({
  selectedNodeId,
  nodes,
  onNodeUpdate,
  onClose,
}: NodeConfigPanelProps) {
  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : null;

  if (!selectedNode) {
    return null;
  }

  const { data } = selectedNode;
  const config = (data.config ?? {}) as Record<string, unknown>;

  function updateConfig(updates: Record<string, unknown>) {
    onNodeUpdate(selectedNode!.id, {
      config: { ...config, ...updates },
    });
  }

  return (
    <aside
      className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-surface-card"
      aria-label="Node configuration"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h3 className="text-sm font-medium capitalize">
            {data.nodeType} configuration
          </h3>
          <p className="text-xs text-muted-foreground">{data.label}</p>
        </div>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onClose}
          aria-label="Close panel"
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Config Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {data.nodeType === "trigger" && (
          <TriggerConfig config={config} onUpdate={updateConfig} />
        )}
        {data.nodeType === "condition" && (
          <ConditionConfig config={config} onUpdate={updateConfig} />
        )}
        {data.nodeType === "delay" && (
          <DelayConfig config={config} onUpdate={updateConfig} />
        )}
        {data.nodeType === "action" && (
          <ActionConfigPanel config={config} onUpdate={updateConfig} />
        )}
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Trigger Config
// ---------------------------------------------------------------------------

function TriggerConfig({
  config,
  onUpdate,
}: {
  config: Record<string, unknown>;
  onUpdate: (updates: Record<string, unknown>) => void;
}) {
  const triggerType = (config.triggerType as string) ?? "";

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="trigger-type-select">Trigger event</FieldLabel>
        <FieldContent>
          <Combobox
            id="trigger-type-select"
            placeholder="Select trigger event"
            options={triggerOptions}
            value={triggerType}
            onValueChange={(v) => onUpdate({ triggerType: v as TriggerType })}
            searchable
            searchPlaceholder="Search triggers"
          />
        </FieldContent>
      </Field>
    </FieldGroup>
  );
}

// ---------------------------------------------------------------------------
// Condition Config
// ---------------------------------------------------------------------------

function ConditionConfig({
  config,
  onUpdate,
}: {
  config: Record<string, unknown>;
  onUpdate: (updates: Record<string, unknown>) => void;
}) {
  const field = (config.field as string) ?? "";
  const operator = (config.operator as string) ?? "eq";
  const value = (config.value as string) ?? "";

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="condition-field">Field path</FieldLabel>
        <FieldContent>
          <Input
            id="condition-field"
            placeholder="e.g. amount, source"
            value={field}
            onChange={(e) => onUpdate({ field: e.target.value })}
          />
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel htmlFor="condition-operator">Operator</FieldLabel>
        <FieldContent>
          <Combobox
            id="condition-operator"
            placeholder="Select operator"
            options={operatorOptions}
            value={operator}
            onValueChange={(v) =>
              onUpdate({ operator: v as ConditionOperator })
            }
          />
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel htmlFor="condition-value">Value</FieldLabel>
        <FieldContent>
          <Input
            id="condition-value"
            placeholder="Comparison value"
            value={value}
            onChange={(e) => onUpdate({ value: e.target.value })}
          />
        </FieldContent>
      </Field>
    </FieldGroup>
  );
}

// ---------------------------------------------------------------------------
// Delay Config
// ---------------------------------------------------------------------------

function DelayConfig({
  config,
  onUpdate,
}: {
  config: Record<string, unknown>;
  onUpdate: (updates: Record<string, unknown>) => void;
}) {
  const delayValue = (config.value as number) ?? 1;
  const delayUnit = (config.unit as string) ?? "days";

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="delay-value">Duration</FieldLabel>
        <FieldContent>
          <Input
            id="delay-value"
            type="number"
            min={1}
            value={delayValue}
            onChange={(e) =>
              onUpdate({ value: Number(e.target.value) || 1 })
            }
          />
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel htmlFor="delay-unit">Unit</FieldLabel>
        <FieldContent>
          <Combobox
            id="delay-unit"
            placeholder="Select unit"
            options={delayUnitOptions}
            value={delayUnit}
            onValueChange={(v) => onUpdate({ unit: v as DelayUnit })}
          />
        </FieldContent>
      </Field>
    </FieldGroup>
  );
}

// ---------------------------------------------------------------------------
// Action Config
// ---------------------------------------------------------------------------

function ActionConfigPanel({
  config,
  onUpdate,
}: {
  config: Record<string, unknown>;
  onUpdate: (updates: Record<string, unknown>) => void;
}) {
  const actionType = (config.actionType as ActionType) ?? "";

  function handleTypeChange(newType: string) {
    // Reset config to defaults for the new action type
    const defaults = getDefaultActionFields(newType as ActionType);
    onUpdate({ actionType: newType, ...defaults });
  }

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="action-type-select">Action type</FieldLabel>
        <FieldContent>
          <Combobox
            id="action-type-select"
            placeholder="Select action"
            options={actionTypeOptions}
            value={actionType}
            onValueChange={handleTypeChange}
            searchable
            searchPlaceholder="Search actions"
          />
        </FieldContent>
      </Field>

      {actionType && (
        <ActionTypeFields
          actionType={actionType}
          config={config}
          onUpdate={onUpdate}
        />
      )}
    </FieldGroup>
  );
}

// ---------------------------------------------------------------------------
// Action Type-Specific Fields
// ---------------------------------------------------------------------------

function ActionTypeFields({
  actionType,
  config,
  onUpdate,
}: {
  actionType: ActionType;
  config: Record<string, unknown>;
  onUpdate: (updates: Record<string, unknown>) => void;
}) {
  switch (actionType) {
    case "create_follow_up":
      return (
        <div className="flex flex-col gap-3">
          <Field>
            <FieldLabel htmlFor="action-follow-up-title">Title</FieldLabel>
            <FieldContent>
              <Input
                id="action-follow-up-title"
                placeholder="Follow-up title"
                value={(config.title as string) ?? ""}
                onChange={(e) => onUpdate({ title: e.target.value })}
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="action-follow-up-reason">Reason</FieldLabel>
            <FieldContent>
              <Input
                id="action-follow-up-reason"
                placeholder="Reason"
                value={(config.reason as string) ?? ""}
                onChange={(e) => onUpdate({ reason: e.target.value })}
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="action-follow-up-days">
              Due offset (days)
            </FieldLabel>
            <FieldContent>
              <Input
                id="action-follow-up-days"
                type="number"
                min={1}
                value={(config.dueDateOffsetDays as number) ?? 3}
                onChange={(e) =>
                  onUpdate({
                    dueDateOffsetDays: Number(e.target.value) || 1,
                  })
                }
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="action-follow-up-channel">Channel</FieldLabel>
            <FieldContent>
              <Combobox
                id="action-follow-up-channel"
                placeholder="Channel"
                options={[
                  { value: "email", label: "Email" },
                  { value: "phone", label: "Phone" },
                  { value: "sms", label: "SMS" },
                  { value: "other", label: "Other" },
                ]}
                value={(config.channel as string) ?? "email"}
                onValueChange={(v) => onUpdate({ channel: v })}
              />
            </FieldContent>
          </Field>
        </div>
      );

    case "send_notification":
      return (
        <div className="flex flex-col gap-3">
          <Field>
            <FieldLabel htmlFor="action-notif-title">Title</FieldLabel>
            <FieldContent>
              <Input
                id="action-notif-title"
                placeholder="Notification title"
                value={(config.title as string) ?? ""}
                onChange={(e) => onUpdate({ title: e.target.value })}
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="action-notif-body">Body</FieldLabel>
            <FieldContent>
              <Input
                id="action-notif-body"
                placeholder="Body (optional)"
                value={(config.body as string) ?? ""}
                onChange={(e) => onUpdate({ body: e.target.value })}
              />
            </FieldContent>
          </Field>
        </div>
      );

    case "send_email":
      return (
        <div className="flex flex-col gap-3">
          <Field>
            <FieldLabel htmlFor="action-email-subject">Subject</FieldLabel>
            <FieldContent>
              <Input
                id="action-email-subject"
                placeholder="Email subject"
                value={(config.subject as string) ?? ""}
                onChange={(e) => onUpdate({ subject: e.target.value })}
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="action-email-body">Body</FieldLabel>
            <FieldContent>
              <Input
                id="action-email-body"
                placeholder="Email body"
                value={(config.body as string) ?? ""}
                onChange={(e) => onUpdate({ body: e.target.value })}
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="action-email-recipient">
              Recipient (optional)
            </FieldLabel>
            <FieldContent>
              <Input
                id="action-email-recipient"
                placeholder="Defaults to customer email"
                value={(config.recipientEmail as string) ?? ""}
                onChange={(e) =>
                  onUpdate({ recipientEmail: e.target.value || undefined })
                }
              />
            </FieldContent>
          </Field>
        </div>
      );

    case "update_inquiry_status":
      return (
        <Field>
          <FieldLabel htmlFor="action-inquiry-status">
            Target status
          </FieldLabel>
          <FieldContent>
            <Input
              id="action-inquiry-status"
              placeholder="e.g. qualified"
              value={(config.status as string) ?? ""}
              onChange={(e) => onUpdate({ status: e.target.value })}
            />
          </FieldContent>
        </Field>
      );

    case "update_quote_status":
      return (
        <Field>
          <FieldLabel htmlFor="action-quote-status">Target status</FieldLabel>
          <FieldContent>
            <Input
              id="action-quote-status"
              placeholder="e.g. expired"
              value={(config.status as string) ?? ""}
              onChange={(e) => onUpdate({ status: e.target.value })}
            />
          </FieldContent>
        </Field>
      );

    case "archive_inquiry":
      return (
        <Field>
          <FieldLabel htmlFor="action-archive-reason">
            Reason (optional)
          </FieldLabel>
          <FieldContent>
            <Input
              id="action-archive-reason"
              placeholder="Archive reason"
              value={(config.reason as string) ?? ""}
              onChange={(e) => onUpdate({ reason: e.target.value })}
            />
          </FieldContent>
        </Field>
      );

    case "create_job_from_quote":
      return (
        <Field>
          <FieldLabel htmlFor="action-job-title">
            Job title (optional)
          </FieldLabel>
          <FieldContent>
            <Input
              id="action-job-title"
              placeholder="Defaults to quote title"
              value={(config.title as string) ?? ""}
              onChange={(e) => onUpdate({ title: e.target.value || undefined })}
            />
          </FieldContent>
        </Field>
      );

    case "generate_invoice":
      return (
        <Field>
          <FieldLabel htmlFor="action-invoice-due">
            Payment due (days)
          </FieldLabel>
          <FieldContent>
            <Input
              id="action-invoice-due"
              type="number"
              min={1}
              value={(config.dueOffsetDays as number) ?? 14}
              onChange={(e) =>
                onUpdate({ dueOffsetDays: Number(e.target.value) || 14 })
              }
            />
          </FieldContent>
        </Field>
      );

    case "generate_draft_quote":
      return (
        <Field orientation="horizontal">
          <FieldLabel htmlFor="action-ai-toggle">Use AI generation</FieldLabel>
          <Switch
            id="action-ai-toggle"
            checked={(config.useAi as boolean) ?? true}
            onCheckedChange={(checked) => onUpdate({ useAi: checked })}
          />
        </Field>
      );

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDefaultActionFields(
  type: ActionType,
): Record<string, unknown> {
  switch (type) {
    case "create_follow_up":
      return { title: "", reason: "", channel: "email", dueDateOffsetDays: 3 };
    case "send_notification":
      return { title: "", body: "" };
    case "send_email":
      return { subject: "", body: "", recipientEmail: undefined };
    case "update_inquiry_status":
      return { status: "" };
    case "update_quote_status":
      return { status: "" };
    case "archive_inquiry":
      return { reason: "" };
    case "create_job_from_quote":
      return { title: undefined };
    case "generate_invoice":
      return { dueOffsetDays: 14 };
    case "generate_draft_quote":
      return { useAi: true };
    default:
      return {};
  }
}
