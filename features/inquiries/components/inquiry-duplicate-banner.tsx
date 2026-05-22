"use client";

import { useTransition } from "react";

import { DuplicateWarningBanner } from "@/features/inquiries/components/duplicate-warning-banner";
import type { DuplicateFlag } from "@/features/inquiries/qualification/types";

type InquiryDuplicateBannerProps = {
  duplicate: DuplicateFlag;
  businessSlug: string;
  dismissAction: () => Promise<void>;
};

export function InquiryDuplicateBanner({
  duplicate,
  businessSlug,
  dismissAction,
}: InquiryDuplicateBannerProps) {
  const [isPending, startTransition] = useTransition();

  function handleDismiss() {
    startTransition(async () => {
      await dismissAction();
    });
  }

  if (isPending) {
    return null;
  }

  return (
    <DuplicateWarningBanner
      duplicate={duplicate}
      businessSlug={businessSlug}
      onDismiss={handleDismiss}
    />
  );
}
