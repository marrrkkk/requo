"use client";

import { useState } from "react";
import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BusinessQuotePreviewOverlay } from "@/features/quotes/components/business-quote-preview-overlay";
import type { PublicQuoteView } from "@/features/quotes/types";
import type { BusinessPlan } from "@/lib/plans/plans";

type QuotePreviewButtonProps = {
  quote: PublicQuoteView;
  businessPlan: BusinessPlan;
  businessContactEmail: string | null;
  businessName: string;
  /** Href to the public customer-facing quote page (when available). */
  openQuoteHref?: string | null;
};

/**
 * Button that opens the full-screen quote preview overlay.
 * Replaces the previous Link-based navigation to a separate preview route.
 */
export function QuotePreviewButton({
  quote,
  businessPlan,
  businessContactEmail,
  businessName,
  openQuoteHref,
}: QuotePreviewButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Eye data-icon="inline-start" />
        Preview
      </Button>

      <BusinessQuotePreviewOverlay
        quote={quote}
        businessPlan={businessPlan}
        businessContactEmail={businessContactEmail}
        businessName={businessName}
        open={open}
        onOpenChange={setOpen}
        openQuoteHref={openQuoteHref}
      />
    </>
  );
}
