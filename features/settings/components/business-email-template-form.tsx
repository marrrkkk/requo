"use client";

import { useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";

import {
  FloatingFormActions,
  useFloatingUnsavedChanges,
} from "@/components/shared/floating-form-actions";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useDeferredRefresh } from "@/hooks/use-deferred-refresh";
import {
  MAX_EMAIL_TEMPLATE_BLOCKS,
  normalizeQuoteEmailTemplate,
  quoteEmailMergeTags,
  type EmailTemplateBlock,
  type QuoteEmailTemplateConfigV2,
} from "@/features/settings/email-templates";
import type {
  BusinessEmailTemplateActionState,
  BusinessSettingsView,
} from "@/features/settings/types";

import { EmailCanvas } from "./email-template-builder/EmailCanvas";
import {
  createDividerBlock,
  createSpacerBlock,
  createTextBlock,
} from "./email-template-builder/default-blocks";

type BusinessEmailTemplateFormProps = {
  action: (
    state: BusinessEmailTemplateActionState,
    formData: FormData,
  ) => Promise<BusinessEmailTemplateActionState>;
  settings: BusinessSettingsView;
};

const initialState: BusinessEmailTemplateActionState = {};

type DraftValues = {
  subject: string;
  blocks: EmailTemplateBlock[];
};

function toDraft(template: QuoteEmailTemplateConfigV2): DraftValues {
  const normalized = normalizeQuoteEmailTemplate(template);
  return {
    subject: normalized.subject,
    blocks: normalized.blocks.map((block) => ({
      ...block,
      style: block.style ? { ...block.style } : undefined,
    })),
  };
}

function draftSerialized(draft: DraftValues) {
  return JSON.stringify(draft);
}

export function BusinessEmailTemplateForm({
  action,
  settings,
}: BusinessEmailTemplateFormProps) {
  const { scheduleRefresh } = useDeferredRefresh();
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    initialState,
  );
  const initialDraft = useMemo(
    () => toDraft(settings.quoteEmailTemplate),
    [settings.quoteEmailTemplate],
  );
  const [draft, setDraft] = useState<DraftValues>(initialDraft);
  const [saved, setSaved] = useState<DraftValues>(initialDraft);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const hasUnsavedChanges =
    draftSerialized(draft) !== draftSerialized(saved);
  const { shouldRenderFloatingActions, floatingActionsState } =
    useFloatingUnsavedChanges(hasUnsavedChanges);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    setSaved(draft);
    scheduleRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleRefresh, state.success]);

  useEffect(() => {
    setDraft(initialDraft);
    setSaved(initialDraft);
    setSelectedBlockId(null);
    setEditingBlockId(null);
  }, [initialDraft]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  function handleCancelChanges() {
    setDraft(saved);
    setSelectedBlockId(null);
    setEditingBlockId(null);
  }

  function handleSelectBlock(id: string | null) {
    setSelectedBlockId(id);
    if (id === null) return;
    if (editingBlockId !== null && editingBlockId !== id) {
      setEditingBlockId(null);
    }
  }

  function handleEditBlock(id: string | null) {
    setEditingBlockId(id);
    if (id !== null) {
      setSelectedBlockId(id);
    }
  }

  function updateSubject(value: string) {
    setDraft((current) => ({ ...current, subject: value }));
  }

  function updateBlock(id: string, patch: Partial<EmailTemplateBlock>) {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.map((block) =>
        block.id === id ? { ...block, ...patch } : block,
      ),
    }));
  }

  function updateBlockStyle(
    id: string,
    key: keyof NonNullable<EmailTemplateBlock["style"]>,
    value: string | undefined,
  ) {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.map((block) => {
        if (block.id !== id) return block;
        const nextStyle = { ...(block.style ?? {}) };
        if (value === undefined || value === "") {
          delete nextStyle[key];
        } else {
          (nextStyle as Record<string, string>)[key] = value;
        }
        return {
          ...block,
          style: Object.keys(nextStyle).length ? nextStyle : undefined,
        };
      }),
    }));
  }

  function toggleBlockVisibility(id: string) {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.map((block) =>
        block.id === id
          ? { ...block, visible: block.visible === false ? true : false }
          : block,
      ),
    }));
  }

  function removeBlock(id: string) {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.filter((block) => block.id !== id),
    }));
    setSelectedBlockId((current) => (current === id ? null : current));
    setEditingBlockId((current) => (current === id ? null : current));
  }

  function addBlock(type: "text" | "divider" | "spacer", index?: number) {
    let insertedId: string | null = null;
    setDraft((current) => {
      if (current.blocks.length >= MAX_EMAIL_TEMPLATE_BLOCKS) return current;
      const next =
        type === "text"
          ? createTextBlock()
          : type === "divider"
            ? createDividerBlock()
            : createSpacerBlock();
      insertedId = next.id;
      if (index === undefined || index < 0 || index > current.blocks.length) {
        return { ...current, blocks: [...current.blocks, next] };
      }
      const blocks = [...current.blocks];
      blocks.splice(index, 0, next);
      return { ...current, blocks };
    });
    if (insertedId) {
      const id = insertedId;
      setSelectedBlockId(id);
      if (type === "text") {
        setEditingBlockId(id);
      }
    }
  }

  const blocksError = state.fieldErrors?.blocks?.[0];
  const subjectError = state.fieldErrors?.subject?.[0];

  return (
    <form action={formAction} className="form-stack pb-28">
      <div className="flex flex-col gap-6">
        <div className="flex items-start gap-3 rounded-xl border border-border/75 bg-muted/30 px-5 py-4">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">
            <span>Available merge tags: </span>
            {quoteEmailMergeTags.map((tag, index) => (
              <span key={tag.tag}>
                <code className="rounded bg-background px-1.5 py-0.5 text-xs font-medium text-foreground">
                  {tag.tag}
                </code>
                <span className="text-xs"> ({tag.label})</span>
                {index < quoteEmailMergeTags.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        </div>

        <section className="section-panel">
          <Field data-invalid={Boolean(subjectError) || undefined}>
            <FieldLabel htmlFor="email-template-subject">
              Subject line
            </FieldLabel>
            <FieldContent>
              <Input
                disabled={isPending}
                id="email-template-subject"
                maxLength={200}
                name="subject"
                onChange={(event) => updateSubject(event.currentTarget.value)}
                placeholder="{{quoteNumber}} from {{businessName}}"
                value={draft.subject}
              />
              <FieldError
                errors={subjectError ? [{ message: subjectError }] : undefined}
              />
            </FieldContent>
          </Field>
          <input
            type="hidden"
            name="blocks"
            value={JSON.stringify(draft.blocks)}
          />
        </section>

        <div>
          <p className="text-sm font-medium text-foreground">Email content</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            This is your actual email. Click a block to edit it, drag blocks
            to reorder, hide blocks to skip them without deleting.
          </p>
        </div>

        <EmailCanvas
          blocks={draft.blocks}
          selectedBlockId={selectedBlockId}
          editingBlockId={editingBlockId}
          isPending={isPending}
          prefersReducedMotion={prefersReducedMotion}
          onReorder={(next) =>
            setDraft((current) => ({ ...current, blocks: next }))
          }
          onSelect={handleSelectBlock}
          onEdit={handleEditBlock}
          onUpdate={updateBlock}
          onUpdateStyle={updateBlockStyle}
          onToggleVisibility={toggleBlockVisibility}
          onRemove={removeBlock}
          onInsert={addBlock}
        />
        {blocksError ? (
          <p className="text-sm text-destructive" role="alert">
            {blocksError}
          </p>
        ) : null}
      </div>

      <FloatingFormActions
        disableSubmit={!hasUnsavedChanges}
        isPending={isPending}
        message="You have unsaved email template changes."
        onCancel={handleCancelChanges}
        state={floatingActionsState}
        submitLabel="Save email template"
        submitPendingLabel="Saving..."
        visible={shouldRenderFloatingActions}
      />
    </form>
  );
}
