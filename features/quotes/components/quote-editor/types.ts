import type {
  DashboardQuoteLibraryEntry,
  QuoteEditorActionState,
  QuoteEditorLineItemValue,
  QuoteEditorValues,
  QuoteLinkedInquirySummary,
} from "@/features/quotes/types";
import type { QuoteBusinessDefaults } from "@/features/quotes/utils";

export type QuoteEditorProps = {
  action: (
    state: QuoteEditorActionState,
    formData: FormData,
  ) => Promise<QuoteEditorActionState>;
  businessDefaults?: QuoteBusinessDefaults;
  businessName: string;
  businessSlug: string;
  currency: string;
  initialValues: QuoteEditorValues;
  linkedInquiry: QuoteLinkedInquirySummary | null;
  pricingLibrary: DashboardQuoteLibraryEntry[];
  quoteNumber?: string;
  revisionComment?: string | null;
  showFloatingUnsavedChanges?: boolean;
  submitLabel: string;
  submitPendingLabel: string;
  canUseAiGenerator?: boolean;
  canUseQuoteLibrary?: boolean;
};

export type EditorLineItem = QuoteEditorLineItemValue & {
  isAiGenerated?: boolean;
};
