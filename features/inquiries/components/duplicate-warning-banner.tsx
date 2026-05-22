"use client";

import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";

import {
  Alert,
  AlertTitle,
  AlertDescription,
  AlertAction,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { DuplicateFlag } from "@/features/inquiries/qualification/types";

type DuplicateWarningBannerProps = {
  duplicate: DuplicateFlag & { dismissed?: boolean };
  businessSlug: string;
  onDismiss: () => void;
};

const reasonMessages: Record<DuplicateFlag["reason"], string> = {
  email_recency:
    "A similar inquiry was submitted from this email within the last 7 days",
  text_similarity:
    "This inquiry has very similar content to a recent submission",
  both: "This inquiry matches a recent submission by email and content",
};

export function DuplicateWarningBanner({
  duplicate,
  businessSlug,
  onDismiss,
}: DuplicateWarningBannerProps) {
  if (duplicate.dismissed) {
    return null;
  }

  return (
    <Alert variant="destructive">
      <AlertTriangle />
      <AlertTitle>This inquiry may be a duplicate</AlertTitle>
      <AlertDescription>
        {reasonMessages[duplicate.reason]}.{" "}
        <Link
          href={`/businesses/${businessSlug}/inquiries/${duplicate.originalInquiryId}`}
        >
          View original inquiry
        </Link>
      </AlertDescription>
      <AlertAction>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onDismiss}
          aria-label="Dismiss duplicate warning"
        >
          <X />
        </Button>
      </AlertAction>
    </Alert>
  );
}
