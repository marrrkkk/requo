import { notFound } from "next/navigation";

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
    <div className="flex flex-col gap-6">
      <div className="max-w-3xl flex flex-col gap-2">
        <span className="eyebrow">New quote</span>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {linkedInquiry
            ? "Turn this inquiry into a polished draft quote."
            : "Create a clean quote draft for the customer."}
        </h1>
        <p className="text-sm leading-7 text-muted-foreground sm:text-base">
          {linkedInquiry
            ? "Customer context from the linked inquiry is prefilled so you can focus on line items, validity, and delivery."
            : "Start from scratch, add line items, and keep the draft ready to send once the scope is right."}
        </p>
      </div>

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
