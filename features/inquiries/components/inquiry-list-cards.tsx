import Link from "next/link";
import { Copy } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardInquiryListItem } from "@/features/inquiries/types";
import {
  formatInquiryDate,
} from "@/features/inquiries/utils";
import { InquiryRecordStateBadge } from "@/features/inquiries/components/inquiry-record-state-badge";
import { InquiryStatusBadge } from "@/features/inquiries/components/inquiry-status-badge";
import { getBusinessInquiryPath } from "@/features/businesses/routes";

type InquiryListCardsProps = {
  inquiries: DashboardInquiryListItem[];
  businessSlug: string;
};

export function InquiryListCards({
  inquiries,
  businessSlug,
}: InquiryListCardsProps) {
  return (
    <div className="data-list-mobile-grid">
      {inquiries.map((inquiry) => {
        return (
          <Link
            className="block"
            href={getBusinessInquiryPath(businessSlug, inquiry.id)}
            key={inquiry.id}
            prefetch={true}
          >
            <Card className="data-list-card transition-colors hover:bg-accent/20">
              <CardHeader className="data-list-card-header">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0 flex flex-1 flex-col gap-1">
                    <CardTitle className="min-w-0 text-lg leading-tight">
                      <span className="flex items-center gap-1.5">
                        <span className="block truncate">{inquiry.customerName}</span>
                        {inquiry.hasDuplicateFlag ? (
                          <Copy
                            aria-label="Potential duplicate"
                            className="size-3.5 shrink-0 text-amber-500"
                          />
                        ) : null}
                      </span>
                    </CardTitle>
                    <CardDescription className="truncate text-sm">
                      {inquiry.customerEmail ?? ""}
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <InquiryStatusBadge status={inquiry.status} />
                      {inquiry.recordState !== "active" ? (
                        <InquiryRecordStateBadge state={inquiry.recordState} />
                      ) : null}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="data-list-card-meta pt-0">
                <div className="info-tile min-w-0 h-full px-3 py-2.5 shadow-none sm:px-3.5 sm:py-3">
                  <span className="meta-label">
                    Form
                  </span>
                  <p className="mt-1.5 truncate text-sm text-foreground sm:mt-2" title={inquiry.inquiryFormName}>
                    {inquiry.inquiryFormName}
                  </p>
                </div>
                <div className="info-tile min-w-0 h-full px-3 py-2.5 shadow-none sm:px-3.5 sm:py-3">
                  <span className="meta-label">
                    Category
                  </span>
                  <p className="mt-1.5 truncate text-sm text-foreground sm:mt-2" title={inquiry.serviceCategory}>
                    {inquiry.serviceCategory}
                  </p>
                </div>
                <div className="info-tile col-span-2 min-w-0 h-full px-3 py-2.5 shadow-none sm:col-span-1 sm:px-3.5 sm:py-3">
                  <span className="meta-label">
                    Created
                  </span>
                  <p className="mt-1.5 truncate text-sm text-foreground sm:mt-2">
                    {formatInquiryDate(inquiry.submittedAt)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
