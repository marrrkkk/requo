import { Building2, Mail, Phone } from "lucide-react";

import { InfoTile } from "@/components/shared/info-tile";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdditionalInquirySubmittedFields } from "@/features/inquiries/form-config";
import type { DashboardInquiryDetail } from "@/features/inquiries/types";
import {
  formatFileSize,
  formatInquiryBudget,
  formatInquiryDateTime,
} from "@/features/inquiries/utils";
import { formatQuoteMoney } from "@/features/quotes/utils";

const MAX_PRINT_DETAILS_CHARS = 460;
const MAX_PRINT_FIELDS = 6;
const MAX_PRINT_ATTACHMENTS = 4;

type InquiryPrintDocumentProps = {
  businessName: string;
  businessCurrency: string;
  inquiry: DashboardInquiryDetail;
};

export function InquiryPrintDocument({
  businessName,
  businessCurrency,
  inquiry,
}: InquiryPrintDocumentProps) {
  const additionalFields = getAdditionalInquirySubmittedFields(
    inquiry.submittedFieldSnapshot,
  ).slice(0, MAX_PRINT_FIELDS);
  const hiddenFieldsCount = Math.max(
    0,
    getAdditionalInquirySubmittedFields(inquiry.submittedFieldSnapshot).length -
      additionalFields.length,
  );
  const attachments = inquiry.attachments.slice(0, MAX_PRINT_ATTACHMENTS);
  const hiddenAttachmentsCount = Math.max(
    0,
    inquiry.attachments.length - attachments.length,
  );
  const details = inquiry.details.trim();
  const detailsPreview =
    details.length > MAX_PRINT_DETAILS_CHARS
      ? `${details.slice(0, MAX_PRINT_DETAILS_CHARS)}...`
      : details;

  return (
    <div className="flex flex-col gap-4 print:gap-2 print:[zoom:0.84] print:text-[11px]">
      <section className="section-panel overflow-hidden print:rounded-none print:border-0 print:bg-transparent print:shadow-none">
        <div className="flex flex-col gap-3 px-4 py-4">
          <div className="flex flex-col gap-2 border-b border-border/70 pb-3">
            <p className="meta-label">Request printout</p>
            <div className="flex flex-col gap-2">
              <h2 className="font-heading text-2xl font-semibold tracking-tight text-balance">
                {inquiry.customerName}
              </h2>
              <p className="text-sm text-muted-foreground">{businessName}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-foreground">
                Ref {inquiry.id}
              </Badge>
              <Badge variant="outline">{inquiry.inquiryFormName}</Badge>
              <Badge variant="outline">
                {formatInquiryDateTime(inquiry.submittedAt)}
              </Badge>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <InfoTile
              icon={Mail}
              label="Email"
              value={inquiry.customerEmail}
            />
            <InfoTile
              icon={Phone}
              label="Phone"
              value={inquiry.customerPhone ?? "Not provided"}
            />
            <InfoTile
              icon={Building2}
              label="Company"
              value={inquiry.companyName ?? "Not provided"}
            />
            <InfoTile
              label="Received"
              value={formatInquiryDateTime(inquiry.submittedAt)}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)]">
        <div className="flex flex-col gap-3">
          <Card className="gap-0 print:rounded-none print:border-0 print:bg-transparent print:shadow-none">
            <CardHeader className="gap-1 pb-2">
              <CardTitle>Request summary</CardTitle>
              <p className="text-sm text-muted-foreground">
                Submitted through the public form.
              </p>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              <InfoTile label="Category" value={inquiry.serviceCategory} />
              <InfoTile label="Form" value={inquiry.inquiryFormName} />
              <InfoTile
                label="Budget"
                value={formatInquiryBudget(inquiry.budgetText)}
              />
              <InfoTile
                label="Deadline"
                value={inquiry.requestedDeadline ?? "Not provided"}
              />
              {inquiry.subject ? (
                <InfoTile
                  className="sm:col-span-2"
                  label="Subject"
                  value={inquiry.subject}
                />
              ) : null}
            </CardContent>
          </Card>

          <Card className="gap-0 print:rounded-none print:border-0 print:bg-transparent print:shadow-none">
            <CardHeader className="gap-1 pb-2">
              <CardTitle>Message</CardTitle>
              <p className="text-sm text-muted-foreground">
                Customer-provided details only.
              </p>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                {detailsPreview}
              </p>
            </CardContent>
          </Card>

          {additionalFields.length ? (
            <Card className="gap-0 print:rounded-none print:border-0 print:bg-transparent print:shadow-none">
              <CardHeader className="gap-1 pb-2">
                <CardTitle>Submitted fields</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Custom fields included with the form response.
                </p>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                {additionalFields.map((field) => (
                  <InfoTile
                    key={field.id}
                    label={field.label}
                    value={field.displayValue}
                  />
                ))}
                {hiddenFieldsCount > 0 ? (
                  <p className="text-xs text-muted-foreground sm:col-span-2">
                    +{hiddenFieldsCount} more submitted field
                    {hiddenFieldsCount === 1 ? "" : "s"} omitted for one-page
                    print.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <Card className="gap-0 print:rounded-none print:border-0 print:bg-transparent print:shadow-none">
            <CardHeader className="gap-1 pb-2">
              <CardTitle>Attachments</CardTitle>
              <p className="text-sm text-muted-foreground">
                File metadata from the request.
              </p>
            </CardHeader>
            <CardContent>
              {attachments.length ? (
                <div className="flex flex-col gap-2">
                  {attachments.map((attachment) => (
                    <div
                      className="soft-panel px-3 py-3 shadow-none print:border print:border-border/70"
                      key={attachment.id}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-medium text-foreground">
                            {attachment.fileName}
                          </p>
                          <Badge variant="secondary">{attachment.contentType}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(attachment.fileSize)} |{" "}
                          {formatInquiryDateTime(attachment.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {hiddenAttachmentsCount > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      +{hiddenAttachmentsCount} more attachment
                      {hiddenAttachmentsCount === 1 ? "" : "s"} omitted for
                      one-page print.
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No attachments were included.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="gap-0 print:rounded-none print:border-0 print:bg-transparent print:shadow-none">
            <CardHeader className="gap-1 pb-2">
              <CardTitle>Related quote</CardTitle>
              <p className="text-sm text-muted-foreground">
                Only included when a quote already exists.
              </p>
            </CardHeader>
            <CardContent>
              {inquiry.relatedQuote ? (
                <div className="grid gap-3">
                  <InfoTile
                    label="Quote"
                    value={inquiry.relatedQuote.quoteNumber ?? inquiry.relatedQuote.id}
                  />
                  <InfoTile label="Status" value={inquiry.relatedQuote.status} />
                  <InfoTile
                    label="Total"
                    value={formatQuoteMoney(
                      inquiry.relatedQuote.totalInCents,
                      businessCurrency,
                    )}
                  />
                  <InfoTile
                    label="Created"
                    value={formatInquiryDateTime(inquiry.relatedQuote.createdAt)}
                  />
                  <InfoTile
                    label="Quote count"
                    value={`${inquiry.relatedQuote.quoteCount}`}
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No related quote has been generated yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
