"use client";

import { useState } from "react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import type { EmailTemplateBlock } from "@/features/settings/email-templates";

import { AddBlock } from "./AddBlock";
import { BlockContent } from "./BlockContent";
import { SortableEmailBlock } from "./SortableEmailBlock";

const EMAIL_CANVAS_DND_CONTEXT_ID = "quote-email-template-canvas-dnd";
const EMAIL_CANVAS_SORTABLE_CONTEXT_ID = "quote-email-template-canvas-sortable";

type EmailCanvasProps = {
  blocks: EmailTemplateBlock[];
  selectedBlockId: string | null;
  editingBlockId: string | null;
  isPending?: boolean;
  prefersReducedMotion?: boolean;
  onReorder: (next: EmailTemplateBlock[]) => void;
  onSelect: (id: string | null) => void;
  onEdit: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<EmailTemplateBlock>) => void;
  onUpdateStyle: (
    id: string,
    key: keyof NonNullable<EmailTemplateBlock["style"]>,
    value: string | undefined,
  ) => void;
  onToggleVisibility: (id: string) => void;
  onRemove: (id: string) => void;
  onInsert: (type: "text" | "divider" | "spacer", index: number) => void;
};

/**
 * Primary editing surface: the email itself. Renders directly from `blocks`
 * (single source of truth), hosts the DnD context, sortable blocks with
 * hover/selection states, and lightweight insertion UI. There is no separate
 * preview — this canvas IS the editor.
 */
export function EmailCanvas({
  blocks,
  selectedBlockId,
  editingBlockId,
  isPending,
  prefersReducedMotion,
  onReorder,
  onSelect,
  onEdit,
  onUpdate,
  onUpdateStyle,
  onToggleVisibility,
  onRemove,
  onInsert,
}: EmailCanvasProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((block) => block.id === active.id);
    const newIndex = blocks.findIndex((block) => block.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(blocks, oldIndex, newIndex));
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  const activeBlock =
    activeId && activeId !== editingBlockId
      ? (blocks.find((block) => block.id === activeId) ?? null)
      : null;

  return (
    <DndContext
      collisionDetection={closestCenter}
      id={EMAIL_CANVAS_DND_CONTEXT_ID}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      sensors={sensors}
    >
      <SortableContext
        id={EMAIL_CANVAS_SORTABLE_CONTEXT_ID}
        items={blocks.map((block) => block.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          className="mx-auto w-full max-w-[640px]"
          onClick={() => {
            onSelect(null);
            onEdit(null);
          }}
        >
          <div
            aria-label="Email canvas"
            role="region"
            className="rounded-xl border border-border/60 bg-background px-4 py-4 shadow-sm sm:px-6 sm:py-5"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="meta-label pb-3">Email canvas</p>
            <div className="flex flex-col" aria-label="Email content blocks">
              <AddBlock
                index={0}
                blockCount={blocks.length}
                disabled={isPending}
                onInsert={onInsert}
              />
              {blocks.map((block, index) => (
                <div key={block.id}>
                  <SortableEmailBlock
                    block={block}
                    index={index}
                    selected={selectedBlockId === block.id}
                    editing={editingBlockId === block.id}
                    isPending={isPending}
                    prefersReducedMotion={prefersReducedMotion}
                    onSelect={onSelect}
                    onEdit={onEdit}
                    onUpdate={onUpdate}
                    onUpdateStyle={onUpdateStyle}
                    onToggleVisibility={onToggleVisibility}
                    onRemove={onRemove}
                  />
                  <AddBlock
                    index={index + 1}
                    blockCount={blocks.length}
                    disabled={isPending}
                    onInsert={onInsert}
                  />
                </div>
              ))}
              <AddBlock
                index={blocks.length}
                blockCount={blocks.length}
                disabled={isPending}
                variant="end"
                onInsert={onInsert}
              />
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Sample data. Email clients may render some styles differently.
          </p>
        </div>
      </SortableContext>
      <DragOverlay
        dropAnimation={
          prefersReducedMotion
            ? null
            : { duration: 160, easing: "cubic-bezier(0.25, 1, 0.5, 1)" }
        }
      >
        {activeBlock ? (
          <div className="rounded-lg border border-border/70 bg-background px-4 py-3 shadow-lg">
            <BlockContent block={activeBlock} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
