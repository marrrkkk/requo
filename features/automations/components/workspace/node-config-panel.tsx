"use client";

import {
  Plus,
  Zap,
  Play,
  Filter,
  Clock,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Combobox } from "@/components/ui/combobox";
import { Field, FieldLabel, FieldContent, FieldGroup } from "@/components/ui/field";
import type { TriggerType } from "../../types";

import type { WorkflowNode } from "./types";
import { triggers, actionBlocks } from "./definitions";

// ---------------------------------------------------------------------------
// Node Config Panel
// ---------------------------------------------------------------------------

export function NodeConfigPanel({
  node,
  onAddNext,
  onDelete,
  onUpdateConfig,
  onChangeTrigger,
}: {
  node: WorkflowNode | null;
  onAddNext: () => void;
  onDelete: (nodeId: string) => void;
  onUpdateConfig: (nodeId: string, config: Record<string, unknown>) => void;
  onChangeTrigger: (triggerId: TriggerType) => void;
}) {
  if (!node) return null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-center gap-2">
          {node.type === "trigger" && <Zap className="size-4 text-primary" />}
          {node.type === "action" && <Play className="size-4 text-green-600" />}
          {node.type === "condition" && <Filter className="size-4 text-amber-600" />}
          {node.type === "delay" && <Clock className="size-4 text-blue-600" />}
          <div>
            <p className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
              {node.type}
            </p>
            <h3 className="text-sm font-medium">{node.label}</h3>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {node.type === "trigger" && (
          <TriggerConfigFields
            node={node}
            onChangeTrigger={onChangeTrigger}
          />
        )}
        {node.type === "action" && (
          <ActionConfigFields
            node={node}
            onUpdateConfig={onUpdateConfig}
          />
        )}
        {node.type === "condition" && (
          <ConditionConfigFields
            node={node}
            onUpdateConfig={onUpdateConfig}
          />
        )}
        {node.type === "delay" && (
          <DelayConfigFields
            node={node}
            onUpdateConfig={onUpdateConfig}
          />
        )}
      </div>

      <div className="border-t border-border p-4 space-y-3">
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Next step</p>
          <button
            type="button"
            onClick={onAddNext}
            className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          >
            <Plus className="size-3.5" />
            Select block
          </button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-destructive hover:text-destructive"
          onClick={() => onDelete(node.id)}
        >
          <Trash2 className="size-3.5" />
          Delete node
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trigger Config Fields
// ---------------------------------------------------------------------------

function TriggerConfigFields({
  node,
  onChangeTrigger,
}: {
  node: WorkflowNode;
  onChangeTrigger: (triggerId: TriggerType) => void;
}) {
  const currentTrigger = (node.config?.triggerType as string) ?? "";
  const triggerOptions = triggers.map((t) => ({ value: t.id, label: t.label }));

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="trigger-type">Trigger event</FieldLabel>
        <FieldContent>
          <Combobox
            id="trigger-type"
            placeholder="Select trigger..."
            searchable
            searchPlaceholder="Search triggers..."
            value={currentTrigger}
            onValueChange={(val) => onChangeTrigger(val as TriggerType)}
            options={triggerOptions}
          />
        </FieldContent>
      </Field>
    </FieldGroup>
  );
}

// ---------------------------------------------------------------------------
// Action Config Fields
// ---------------------------------------------------------------------------

function ActionConfigFields({
  node,
  onUpdateConfig,
}: {
  node: WorkflowNode;
  onUpdateConfig: (nodeId: string, config: Record<string, unknown>) => void;
}) {
  const actionType = (node.config?.actionType as string) ?? "";
  const actionOptions = actionBlocks.map((a) => ({ value: a.id, label: a.label }));

  function update(field: string, value: unknown) {
    onUpdateConfig(node.id, { [field]: value });
  }

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="action-type">Action type</FieldLabel>
        <FieldContent>
          <Combobox
            id="action-type"
            placeholder="Select action..."
            searchable
            searchPlaceholder="Search actions..."
            value={actionType}
            onValueChange={(val) => {
              onUpdateConfig(node.id, { actionType: val });
            }}
            options={actionOptions}
          />
        </FieldContent>
      </Field>

      {actionType === "create_follow_up" && (
        <>
          <Field>
            <FieldLabel htmlFor="follow-up-title">Title</FieldLabel>
            <FieldContent>
              <Input
                id="follow-up-title"
                placeholder="Follow-up title"
                defaultValue={(node.config?.title as string) ?? ""}
                onBlur={(e) => update("title", e.target.value)}
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="follow-up-reason">Reason</FieldLabel>
            <FieldContent>
              <Input
                id="follow-up-reason"
                placeholder="Reason for follow-up"
                defaultValue={(node.config?.reason as string) ?? ""}
                onBlur={(e) => update("reason", e.target.value)}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="follow-up-channel">Channel</FieldLabel>
            <FieldContent>
              <Combobox
                id="follow-up-channel"
                placeholder="Select channel..."
                value={(node.config?.channel as string) ?? "email"}
                onValueChange={(val) => update("channel", val)}
                options={[
                  { value: "email", label: "Email" },
                  { value: "phone", label: "Phone" },
                  { value: "sms", label: "SMS" },
                  { value: "whatsapp", label: "WhatsApp" },
                  { value: "messenger", label: "Messenger" },
                  { value: "instagram", label: "Instagram" },
                  { value: "other", label: "Other" },
                ]}
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="follow-up-due">Due offset (days)</FieldLabel>
            <FieldContent>
              <Input
                id="follow-up-due"
                type="number"
                min={1}
                defaultValue={(node.config?.dueDateOffsetDays as number) ?? 3}
                onBlur={(e) => update("dueDateOffsetDays", Number(e.target.value))}
              />
            </FieldContent>
          </Field>
        </>
      )}

      {actionType === "send_email" && (
        <>
          <Field>
            <FieldLabel htmlFor="email-subject">Subject</FieldLabel>
            <FieldContent>
              <Input
                id="email-subject"
                placeholder="Email subject"
                defaultValue={(node.config?.subject as string) ?? ""}
                onBlur={(e) => update("subject", e.target.value)}
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="email-body">Body</FieldLabel>
            <FieldContent>
              <Textarea
                id="email-body"
                placeholder="Email body..."
                rows={4}
                defaultValue={(node.config?.body as string) ?? ""}
                onBlur={(e) => update("body", e.target.value)}
              />
            </FieldContent>
          </Field>
        </>
      )}

      {actionType === "send_notification" && (
        <>
          <Field>
            <FieldLabel htmlFor="notif-title">Title</FieldLabel>
            <FieldContent>
              <Input
                id="notif-title"
                placeholder="Notification title"
                defaultValue={(node.config?.title as string) ?? ""}
                onBlur={(e) => update("title", e.target.value)}
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="notif-body">Body</FieldLabel>
            <FieldContent>
              <Textarea
                id="notif-body"
                placeholder="Notification body..."
                rows={3}
                defaultValue={(node.config?.body as string) ?? ""}
                onBlur={(e) => update("body", e.target.value)}
              />
            </FieldContent>
          </Field>
        </>
      )}

      {actionType === "update_inquiry_status" && (
        <Field>
          <FieldLabel htmlFor="inquiry-status">Status</FieldLabel>
          <FieldContent>
            <Combobox
              id="inquiry-status"
              placeholder="Select status"
              value={(node.config?.status as string) ?? ""}
              onValueChange={(val) => update("status", val)}
              options={[
                { value: "new", label: "New" },
                { value: "quoted", label: "Quoted" },
                { value: "waiting", label: "Waiting" },
                { value: "won", label: "Won" },
                { value: "lost", label: "Lost" },
              ]}
            />
          </FieldContent>
        </Field>
      )}

      {actionType === "update_quote_status" && (
        <Field>
          <FieldLabel htmlFor="quote-status">Status</FieldLabel>
          <FieldContent>
            <Combobox
              id="quote-status"
              placeholder="Select status"
              value={(node.config?.status as string) ?? ""}
              onValueChange={(val) => update("status", val)}
              options={[
                { value: "draft", label: "Draft" },
                { value: "sent", label: "Sent" },
                { value: "expired", label: "Expired" },
                { value: "voided", label: "Voided" },
              ]}
            />
          </FieldContent>
        </Field>
      )}

      {actionType === "archive_inquiry" && (
        <Field>
          <FieldLabel htmlFor="archive-reason">Reason</FieldLabel>
          <FieldContent>
            <Input
              id="archive-reason"
              placeholder="Archive reason (optional)"
              defaultValue={(node.config?.reason as string) ?? ""}
              onBlur={(e) => update("reason", e.target.value)}
            />
          </FieldContent>
        </Field>
      )}

      {actionType === "create_job_from_quote" && (
        <Field>
          <FieldLabel htmlFor="job-title">Job title (optional)</FieldLabel>
          <FieldContent>
            <Input
              id="job-title"
              placeholder="Leave empty for default"
              defaultValue={(node.config?.title as string) ?? ""}
              onBlur={(e) => update("title", e.target.value)}
            />
          </FieldContent>
        </Field>
      )}

      {actionType === "generate_invoice" && (
        <Field>
          <FieldLabel htmlFor="invoice-due">Due offset (days)</FieldLabel>
          <FieldContent>
            <Input
              id="invoice-due"
              type="number"
              min={1}
              defaultValue={(node.config?.dueOffsetDays as number) ?? 14}
              onBlur={(e) => update("dueOffsetDays", Number(e.target.value))}
            />
          </FieldContent>
        </Field>
      )}

      {actionType === "generate_draft_quote" && (
        <Field orientation="horizontal">
          <FieldLabel htmlFor="ai-toggle">Use AI</FieldLabel>
          <FieldContent>
            <Switch
              id="ai-toggle"
              checked={(node.config?.useAi as boolean) ?? true}
              onCheckedChange={(checked) => update("useAi", checked)}
            />
          </FieldContent>
        </Field>
      )}

      {actionType === "add_internal_note" && (
        <Field>
          <FieldLabel htmlFor="note-body">Note</FieldLabel>
          <FieldContent>
            <Textarea
              id="note-body"
              placeholder="Internal note text..."
              rows={4}
              defaultValue={(node.config?.note as string) ?? ""}
              onBlur={(e) => update("note", e.target.value)}
            />
          </FieldContent>
        </Field>
      )}

      {actionType === "duplicate_quote" && (
        <Field>
          <FieldLabel htmlFor="duplicate-suffix">Title suffix</FieldLabel>
          <FieldContent>
            <Input
              id="duplicate-suffix"
              placeholder="(copy)"
              defaultValue={(node.config?.titleSuffix as string) ?? "(copy)"}
              onBlur={(e) => update("titleSuffix", e.target.value)}
            />
          </FieldContent>
        </Field>
      )}
    </FieldGroup>
  );
}

// ---------------------------------------------------------------------------
// Condition Config Fields
// ---------------------------------------------------------------------------

function ConditionConfigFields({
  node,
  onUpdateConfig,
}: {
  node: WorkflowNode;
  onUpdateConfig: (nodeId: string, config: Record<string, unknown>) => void;
}) {
  const operatorOptions = [
    { value: "eq", label: "Equals" },
    { value: "neq", label: "Not equals" },
    { value: "gt", label: "Greater than" },
    { value: "gte", label: "Greater than or equal" },
    { value: "lt", label: "Less than" },
    { value: "lte", label: "Less than or equal" },
    { value: "contains", label: "Contains" },
    { value: "not_contains", label: "Does not contain" },
  ];

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="cond-field">Field</FieldLabel>
        <FieldContent>
          <Input
            id="cond-field"
            placeholder="e.g. inquiry.source"
            defaultValue={(node.config?.field as string) ?? ""}
            onBlur={(e) => onUpdateConfig(node.id, { field: e.target.value })}
          />
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel htmlFor="cond-operator">Operator</FieldLabel>
        <FieldContent>
          <Combobox
            id="cond-operator"
            placeholder="Select operator..."
            value={(node.config?.operator as string) ?? "eq"}
            onValueChange={(val) => onUpdateConfig(node.id, { operator: val })}
            options={operatorOptions}
          />
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel htmlFor="cond-value">Value</FieldLabel>
        <FieldContent>
          <Input
            id="cond-value"
            placeholder="Comparison value"
            defaultValue={(node.config?.value as string) ?? ""}
            onBlur={(e) => onUpdateConfig(node.id, { value: e.target.value })}
          />
        </FieldContent>
      </Field>
    </FieldGroup>
  );
}

// ---------------------------------------------------------------------------
// Delay Config Fields
// ---------------------------------------------------------------------------

function DelayConfigFields({
  node,
  onUpdateConfig,
}: {
  node: WorkflowNode;
  onUpdateConfig: (nodeId: string, config: Record<string, unknown>) => void;
}) {
  const unitOptions = [
    { value: "minutes", label: "Minutes" },
    { value: "hours", label: "Hours" },
    { value: "days", label: "Days" },
  ];

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="delay-value">Delay value</FieldLabel>
        <FieldContent>
          <Input
            id="delay-value"
            type="number"
            min={1}
            defaultValue={(node.config?.value as number) ?? 1}
            onBlur={(e) => onUpdateConfig(node.id, { value: Number(e.target.value) })}
          />
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel htmlFor="delay-unit">Unit</FieldLabel>
        <FieldContent>
          <Combobox
            id="delay-unit"
            placeholder="Select unit..."
            value={(node.config?.unit as string) ?? "hours"}
            onValueChange={(val) => onUpdateConfig(node.id, { unit: val })}
            options={unitOptions}
          />
        </FieldContent>
      </Field>
    </FieldGroup>
  );
}
