"use client";

import Link from "next/link";
import { useCallback, useRef, useSyncExternalStore } from "react";
import { ArrowLeft, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicInquiryPageRenderer } from "@/features/inquiries/components/public-inquiry-page-renderer";
import {
  readInquiryPreviewDraft,
  subscribeToInquiryPreviewDraft,
} from "@/features/inquiries/preview-draft-client";
import type { PublicInquiryBusiness, PublicInquiryFormState } from "@/features/inquiries/types";

type BusinessInquiryPreviewShellProps = {
  business: PublicInquiryBusiness;
  action: (
    state: PublicInquiryFormState,
    formData: FormData,
  ) => Promise<PublicInquiryFormState>;
  draftSessionId?: string;
  settingsHref: string;
};

export function BusinessInquiryPreviewShell({
  business,
  action,
  draftSessionId,
  settingsHref,
}: BusinessInquiryPreviewShellProps) {
  const cachedDraftRef = useRef<{
    sessionId: string;
    updatedAt: number;
    snapshot: PublicInquiryBusiness;
  } | null>(null);
  const isLiveDraftPreview = Boolean(draftSessionId);
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!draftSessionId) {
        return () => undefined;
      }

      return subscribeToInquiryPreviewDraft(draftSessionId, () => {
        onStoreChange();
      });
    },
    [draftSessionId],
  );
  const getSnapshot = useCallback(() => {
    if (!draftSessionId) {
      return business;
    }

    const draft = readInquiryPreviewDraft(draftSessionId);

    if (!draft) {
      return business;
    }

    const cachedDraft = cachedDraftRef.current;

    if (
      cachedDraft &&
      cachedDraft.sessionId === draftSessionId &&
      cachedDraft.updatedAt === draft.updatedAt
    ) {
      return cachedDraft.snapshot;
    }

    cachedDraftRef.current = {
      sessionId: draftSessionId,
      updatedAt: draft.updatedAt,
      snapshot: draft.snapshot,
    };

    return draft.snapshot;
  }, [business, draftSessionId]);
  const previewBusiness = useSyncExternalStore(subscribe, getSnapshot, () => business);

  return (
    <PublicInquiryPageRenderer
      action={action}
      beforeHero={
        <div className="w-full">
          <Card className="border-primary/22 bg-primary/12 shadow-none">
            <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div className="flex min-w-0 items-start gap-2 text-primary">
                <Eye className="size-4 text-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {isLiveDraftPreview ? "Live draft preview" : "Preview mode"}
                  </p>
                  <p className="text-xs leading-5 text-primary/80">
                    {isLiveDraftPreview
                      ? "This preview reflects your current editor changes instantly. Customers still cannot send inquiries from this page."
                      : "Review the saved request page and form. Customers cannot send inquiries from this preview."}
                  </p>
                </div>
              </div>
              <Button asChild variant="outline">
                <Link href={settingsHref} prefetch={true}>
                  <ArrowLeft data-icon="inline-start" />
                  Back to editor
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      }
      business={previewBusiness}
      previewMode
    />
  );
}
