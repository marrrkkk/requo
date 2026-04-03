import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { createQuoteAction } from "@/features/quotes/actions";
import { QuoteEditor } from "@/features/quotes/components/quote-editor";
import { getInquiryQuotePrefillForWorkspace } from "@/features/quotes/queries";
import { inquiryRouteParamsSchema } from "@/features/inquiries/schemas";
import {
  createQuoteEditorLineItem,
  getDefaultQuoteValidityDate,
  getQuoteEditorInitialValuesFromInquiry,
} from "@/features/quotes/utils";
import { requireCurrentWorkspaceContext } from "@/lib/db/workspace-access";

type NewQuotePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewQuotePage({
  searchParams,
}: NewQuotePageProps) {
  const { workspaceContext } = await requireCurrentWorkspaceContext();
  const rawSearchParams = await searchParams;
  const rawInquiryId = Array.isArray(rawSearchParams.inquiryId)
    ? rawSearchParams.inquiryId[0]
    : rawSearchParams.inquiryId;
  const parsedInquiryId = inquiryRouteParamsSchema.safeParse({
    id: rawInquiryId,
  });
  const inquiryId = parsedInquiryId.success ? parsedInquiryId.data.id : undefined;
  const inquiryPrefill = inquiryId
    ? await getInquiryQuotePrefillForWorkspace({
        workspaceId: workspaceContext.workspace.id,
        inquiryId,
      })
    : null;

  if (rawInquiryId && inquiryId && !inquiryPrefill) {
    notFound();
  }

  const initialValues = inquiryPrefill
    ? getQuoteEditorInitialValuesFromInquiry(inquiryPrefill)
    : {
        title: "",
        customerName: "",
        customerEmail: "",
        notes: "",
        validUntil: getDefaultQuoteValidityDate(),
        discount: "",
        items: [createQuoteEditorLineItem()],
      };
  const linkedInquiry = inquiryPrefill
    ? {
        id: inquiryPrefill.id,
        customerName: inquiryPrefill.customerName,
        customerEmail: inquiryPrefill.customerEmail,
        serviceCategory: inquiryPrefill.serviceCategory,
        status: inquiryPrefill.status,
      }
    : null;
  const action = createQuoteAction.bind(null, inquiryPrefill?.id ?? null);

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow="New quote"
        title={
          linkedInquiry
            ? "Turn this inquiry into a quote"
            : "Create a new quote"
        }
        description={
          linkedInquiry
            ? "Customer details are prefilled from the linked inquiry."
            : "Add the customer, line items, and validity date."
        }
      />

      <QuoteEditor
        action={action}
        workspaceName={workspaceContext.workspace.name}
        currency={workspaceContext.workspace.defaultCurrency}
        initialValues={initialValues}
        linkedInquiry={linkedInquiry}
        submitLabel="Create draft quote"
        submitPendingLabel="Creating draft..."
      />
    </div>
  );
}
