import type { InquiryPageTemplate } from "@/features/inquiries/page-config";
import type { InquirySubmittedFieldSnapshot } from "@/features/inquiries/form-config";
import type { BusinessMemoryContext } from "@/features/memory/types";
import type { InquiryStatus } from "@/features/inquiries/types";
import type { BusinessType } from "@/features/inquiries/business-types";

export const aiAssistantIntents = [
  "draft-first-reply",
  "summarize-inquiry",
  "suggest-follow-up-questions",
  "suggest-quote-line-items",
  "rewrite-draft",
  "generate-follow-up-message",
  "custom",
] as const;

export type AiAssistantIntent = (typeof aiAssistantIntents)[number];

export type InquiryAssistantContext = {
  business: {
    id: string;
    name: string;
    slug: string;
    shortDescription: string | null;
    contactEmail: string | null;
    defaultCurrency: string;
    defaultEmailSignature: string | null;
    defaultQuoteNotes: string | null;
    aiTonePreference: "balanced" | "warm" | "direct" | "formal";
    inquiryPageHeadline: string;
    inquiryPageTemplate: InquiryPageTemplate;
    publicInquiryEnabled: boolean;
  };
  inquiry: {
    id: string;
    businessInquiryFormId: string;
    inquiryFormName: string;
    inquiryFormSlug: string;
    inquiryFormBusinessType: BusinessType;
    customerName: string;
    customerEmail: string;
    customerPhone: string | null;
    companyName: string | null;
    serviceCategory: string;
    requestedDeadline: string | null;
    budgetText: string | null;
    subject: string | null;
    details: string;
    source: string | null;
    status: InquiryStatus;
    submittedAt: Date;
    createdAt: Date;
    submittedFieldSnapshot: InquirySubmittedFieldSnapshot | null;
  };
  notes: Array<{
    id: string;
    body: string;
    createdAt: Date;
    authorName: string | null;
  }>;
  memory: BusinessMemoryContext;
};

export type AiAssistantFieldErrors = Partial<
  Record<"customPrompt" | "sourceDraft", string[] | undefined>
>;

export type AiAssistantResult = {
  intent: AiAssistantIntent;
  title: string;
  output: string;
  model: string;
  canInsertIntoReply: boolean;
};

export type AiAssistantActionState = {
  error?: string;
  fieldErrors?: AiAssistantFieldErrors;
  result?: AiAssistantResult;
};

export type AiAssistantStreamEvent =
  | {
      type: "meta";
      title: string;
      model: string;
    }
  | {
      type: "delta";
      value: string;
    }
  | {
      type: "done";
      truncated: boolean;
    }
  | {
      type: "error";
      message: string;
    };

export const aiAssistantTruncationMessage =
  "The response hit the current output limit. Ask the assistant to continue if you need the rest.";
