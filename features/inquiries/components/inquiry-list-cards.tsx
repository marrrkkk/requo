import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardInquiryListItem } from "@/features/inquiries/types";
import {
  formatInquiryBudget,
  formatInquiryDate,
} from "@/features/inquiries/utils";
import { InquiryStatusBadge } from "@/features/inquiries/components/inquiry-status-badge";
import { getWorkspaceInquiryPath } from "@/features/workspaces/routes";

type InquiryListCardsProps = {
  inquiries: DashboardInquiryListItem[];
  workspaceSlug: string;
};

export function InquiryListCards({
  inquiries,
  workspaceSlug,
}: InquiryListCardsProps) {
  return (
    <div className="data-list-mobile-grid">
      {inquiries.map((inquiry) => (
        <Card key={inquiry.id} className="data-list-card">
          <CardHeader className="data-list-card-header">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex flex-col gap-1">
                <CardTitle className="text-lg leading-tight">
                  <Link
                    className="block truncate underline-offset-4 transition-colors hover:text-primary hover:underline"
                    href={getWorkspaceInquiryPath(workspaceSlug, inquiry.id)}
                    prefetch={true}
                  >
                    {inquiry.customerName}
                  </Link>
                </CardTitle>
                <CardDescription className="truncate text-sm">
                  {inquiry.customerEmail}
                </CardDescription>
              </div>
              <InquiryStatusBadge status={inquiry.status} />
            </div>
          </CardHeader>
          <CardContent className="data-list-card-meta pt-0">
            <div className="info-tile h-full px-3.5 py-3 shadow-none">
              <span className="meta-label">
                Form
              </span>
              <p className="mt-2 line-clamp-2 text-sm text-foreground">
                {inquiry.inquiryFormName}
              </p>
            </div>
            <div className="info-tile h-full px-3.5 py-3 shadow-none">
              <span className="meta-label">
                Category
              </span>
              <p className="mt-2 line-clamp-2 text-sm text-foreground">
                {inquiry.serviceCategory}
              </p>
            </div>
            <div className="info-tile h-full px-3.5 py-3 shadow-none">
              <span className="meta-label">
                Budget
              </span>
              <p className="mt-2 text-sm text-foreground">
                {formatInquiryBudget(inquiry.budgetText)}
              </p>
            </div>
            <div className="info-tile h-full px-3.5 py-3 shadow-none">
              <span className="meta-label">
                Created
              </span>
              <p className="mt-2 text-sm text-foreground">
                {formatInquiryDate(inquiry.submittedAt)}
              </p>
            </div>
          </CardContent>
          <CardFooter className="data-list-card-footer">
            <span className="text-sm text-muted-foreground">
              Customer inquiry ready for triage and follow-up.
            </span>
            <Button asChild className="w-full sm:w-auto" size="sm" variant="outline">
              <Link
                href={getWorkspaceInquiryPath(workspaceSlug, inquiry.id)}
                prefetch={true}
              >
                Open inquiry
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
