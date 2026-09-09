"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import type { EmailTemplateBlock } from "@/features/settings/email-templates";

import { SortableBlockCard } from "./SortableBlockCard";

const EMAIL_BUILDER_DND_CONTEXT_ID = "quote-email-template-builder-dnd";
const EMAIL_BUILDER_SORTABLE_CONTEXT_ID = "quote-email-template-builder-sortable";

type BuilderCanvasProps = {
  blocks: EmailTemplateBlock[];
  isPending?: boolean;
  prefersReducedMotion?: boolean;
  onReorder: (next: EmailTemplateBlock[]) => void;
  onUpdate: (id: string, patch: Partial<EmailTemplateBlock>) => void;
  onUpdateStyle: (
    id: string,
    key: keyof NonNullable<EmailTemplateBlock["style"]>,
    value: string | undefined,
  ) => void;
  onToggleVisibility: (id: string) => void;
  onRemove: (id: string) => void;
};

export function BuilderCanvas({
  blocks,
  isPending,
  prefersReducedMotion,
  onReorder,
  onUpdate,
  onUpdateStyle,
  onToggleVisibility,
  onRemove,
}: BuilderCanvasProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((block) => block.id === active.id);
    const newIndex = blocks.findIndex((block) => block.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(blocks, oldIndex, newIndex));
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      id={EMAIL_BUILDER_DND_CONTEXT_ID}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <SortableContext
        id={EMAIL_BUILDER_SORTABLE_CONTEXT_ID}
        items={blocks.map((block) => block.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-4" aria-label="Email content blocks">
          {blocks.map((block, index) => (
            <SortableBlockCard
              key={block.id}
              block={block}
              index={index}
              isPending={isPending}
              prefersReducedMotion={prefersReducedMotion}
              onUpdate={onUpdate}
              onUpdateStyle={onUpdateStyle}
              onToggleVisibility={onToggleVisibility}
              onRemove={onRemove}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
