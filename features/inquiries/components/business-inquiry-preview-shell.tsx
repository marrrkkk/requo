"use client";

import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicInquiryPageRenderer } from "@/features/inquiries/components/public-inquiry-page-renderer";
import type { PublicInquiryBusiness, PublicInquiryFormState } from "@/features/inquiries/types";

type BusinessInquiryPreviewShellProps = {
  business: PublicInquiryBusiness;
  action: (
    state: PublicInquiryFormState,
    formData: FormData,
  ) => Promise<PublicInquiryFormState>;
  settingsHref: string;
};

export function BusinessInquiryPreviewShell({
  business,
  action,
  settingsHref,
}: BusinessInquiryPreviewShellProps) {
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
                  <p className="text-sm font-medium">Preview mode</p>
                  <p className="text-xs leading-5 text-primary/80">
                    Review the saved request page and form. Customers cannot
                    send inquiries from this preview.
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
      business={business}
      previewMode
    />
  );
}
