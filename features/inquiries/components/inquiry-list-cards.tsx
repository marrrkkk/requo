import Link from "next/link";
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
                      <span className="block truncate">{inquiry.customerName}</span>
                    </CardTitle>
                    <CardDescription className="truncate text-sm">
                      {inquiry.customerEmail ?? ""}
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <InquiryStatusBadge status={inquiry.status} />
                    {inquiry.recordState !== "active" ? (
                      <InquiryRecordStateBadge state={inquiry.recordState} />
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="data-list-card-meta pt-0">
                <div className="info-tile min-w-0 h-full px-3.5 py-3 shadow-none">
                  <span className="meta-label">
                    Form
                  </span>
                  <p className="mt-2 truncate text-sm text-foreground" title={inquiry.inquiryFormName}>
                    {inquiry.inquiryFormName}
                  </p>
                </div>
                <div className="info-tile min-w-0 h-full px-3.5 py-3 shadow-none">
                  <span className="meta-label">
                    Category
                  </span>
                  <p className="mt-2 truncate text-sm text-foreground" title={inquiry.serviceCategory}>
                    {inquiry.serviceCategory}
                  </p>
                </div>
                <div className="info-tile min-w-0 h-full px-3.5 py-3 shadow-none">
                  <span className="meta-label">
                    Created
                  </span>
                  <p className="mt-2 truncate text-sm text-foreground">
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
