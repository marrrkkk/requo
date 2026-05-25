"use client";

import { useCallback, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { WorkflowCanvas } from "@/features/automations/components/builder/workflow-canvas";
import { serializeWorkflow } from "@/features/automations/components/builder/utils/serializer";
import { updateAutomation } from "@/features/automations/mutations";
import type { WorkflowState } from "@/features/automations/components/builder/hooks/use-workflow-state";

type WorkflowBuilderPageProps = {
  automationId: string;
  automationName: string;
  businessSlug: string;
  initialState?: Partial<WorkflowState>;
};

export function WorkflowBuilderPage({
  automationId,
  automationName,
  businessSlug,
  initialState,
}: WorkflowBuilderPageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const lastSavedStateRef = useRef<WorkflowState | null>(null);

  const handleBack = useCallback(() => {
    router.push(`/${businessSlug}/automations`);
  }, [router, businessSlug]);

  const handleSave = useCallback(
    (state: WorkflowState) => {
      lastSavedStateRef.current = state;
      const serialized = serializeWorkflow(state);

      startTransition(async () => {
        const result = await updateAutomation(automationId, {
          actions: serialized,
        });

        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success("Workflow saved.");
        }
      });
    },
    [automationId],
  );

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface-card px-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleBack}
            aria-label="Back to automations"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-sm font-medium leading-tight">
              {automationName}
            </h1>
            <p className="text-xs text-muted-foreground">Workflow Builder</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleBack}>
            Cancel
          </Button>
          <Button size="sm" disabled={isPending} data-save-trigger>
            <Save className="size-3.5" />
            {isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </header>

      {/* Full-page canvas — the canvas toolbar has its own save button */}
      <div className="flex-1 overflow-hidden">
        <WorkflowCanvas
          initialState={initialState}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
