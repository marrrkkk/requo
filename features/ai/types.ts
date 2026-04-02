import type { WorkspaceKnowledgeContext } from "@/features/knowledge/types";
import type { InquiryStatus } from "@/features/inquiries/types";

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
  workspace: {
    id: string;
    name: string;
    slug: string;
    defaultCurrency: string;
    inquiryHeadline: string | null;
    publicInquiryEnabled: boolean;
  };
  inquiry: {
    id: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string | null;
    serviceCategory: string;
    requestedDeadline: string | null;
    budgetText: string | null;
    subject: string | null;
    details: string;
    source: string | null;
    status: InquiryStatus;
    submittedAt: Date;
    createdAt: Date;
  };
  notes: Array<{
    id: string;
    body: string;
    createdAt: Date;
    authorName: string | null;
  }>;
  knowledge: WorkspaceKnowledgeContext;
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
