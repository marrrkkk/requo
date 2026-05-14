import type { InquiryPageTemplate } from "@/features/inquiries/page-config";
import type { InquirySubmittedFieldSnapshot } from "@/features/inquiries/form-config";
import type { BusinessMemoryContext } from "@/features/memory/types";
import type { InquiryStatus } from "@/features/inquiries/types";
import type { BusinessType } from "@/features/inquiries/business-types";
import type { FollowUpChannel, FollowUpStatus } from "@/features/follow-ups/types";
import type {
  QuotePostAcceptanceStatus,
  QuoteStatus,
} from "@/features/quotes/types";
import type { AiProviderName } from "@/lib/ai";

export const aiSurfaces = ["inquiry", "quote", "dashboard"] as const;

export type AiSurface = (typeof aiSurfaces)[number];

export type AiConversation = {
  id: string;
  userId: string;
  businessId: string;
  surface: AiSurface;
  entityId: string;
  title: string | null;
  isDefault: boolean;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AiConversationSummary = AiConversation & {
  lastMessagePreview: string | null;
};

export const aiMessageRoles = ["user", "assistant", "system"] as const;

export type AiMessageRole = (typeof aiMessageRoles)[number];

export const aiMessageStatuses = [
  "completed",
  "generating",
  "failed",
] as const;

export type AiMessageStatus = (typeof aiMessageStatuses)[number];

export type AiMessage = {
  id: string;
  conversationId: string;
  role: AiMessageRole;
  content: string;
  provider: AiProviderName | null;
  model: string | null;
  status: AiMessageStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type AiMessagesPage = {
  messages: AiMessage[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type AiChatStreamEvent =
  | {
      type: "conversation";
      conversation: AiConversation;
    }
  | {
      type: "messages";
      userMessage: AiMessage;
      assistantMessage: AiMessage;
    }
  | {
      type: "meta";
      title: string;
      model: string;
      provider?: AiProviderName;
      providerModel?: string;
    }
  | {
      type: "status";
      message: string;
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

export type InquiryAssistantContext = {
  business: {
    id: string;
    name: string;
    slug: string;
    businessType: BusinessType;
    shortDescription: string | null;
    contactEmail: string | null;
    defaultCurrency: string;
    defaultEmailSignature: string | null;
    defaultQuoteNotes: string | null;
    aiTonePreference: "balanced" | "warm" | "direct" | "formal";
    createdAt: Date;
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
    customerEmail: string | null;
    customerContactMethod: string;
    customerContactHandle: string;
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
  attachments: Array<{
    id: string;
    fileName: string;
    contentType: string;
    fileSize: number;
    createdAt: Date;
  }>;
  activities: Array<{
    id: string;
    type: string;
    summary: string;
    createdAt: Date;
    actorName: string | null;
  }>;
  followUps: Array<{
    id: string;
    inquiryId: string | null;
    quoteId: string | null;
    quoteNumber: string | null;
    quoteTitle: string | null;
    title: string;
    reason: string;
    channel: FollowUpChannel;
    dueAt: Date;
    completedAt: Date | null;
    skippedAt: Date | null;
    status: FollowUpStatus;
    createdAt: Date;
    updatedAt: Date;
  }>;
  relatedQuotes: Array<{
    id: string;
    quoteNumber: string;
    title: string;
    customerName: string;
    customerEmail: string | null;
    customerContactMethod: string;
    customerContactHandle: string;
    currency: string;
    notes: string | null;
    subtotalInCents: number;
    discountInCents: number;
    totalInCents: number;
    validUntil: string;
    status: QuoteStatus;
    postAcceptanceStatus: QuotePostAcceptanceStatus;
    sentAt: Date | null;
    acceptedAt: Date | null;
    publicViewedAt: Date | null;
    customerRespondedAt: Date | null;
    customerResponseMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
    items: Array<{
      id: string;
      description: string;
      quantity: number;
      unitPriceInCents: number;
      lineTotalInCents: number;
      position: number;
    }>;
    activities: Array<{
      id: string;
      type: string;
      summary: string;
      createdAt: Date;
      actorName: string | null;
    }>;
  }>;
  memory: BusinessMemoryContext;
};

/**
 * Draft payload returned by the AI quote generator.
 * Values are normalised so the client can patch the editor without further parsing.
 */
export type AiQuoteDraftItem = {
  description: string;
  quantity: number;
  unitPriceInCents: number;
};

export type AiQuoteDraft = {
  title: string;
  notes: string | null;
  items: AiQuoteDraftItem[];
  /** Present when the draft leaned on a pricing library entry. */
  pricingLibraryEntryId?: string | null;
  model: string;
  provider: AiProviderName;
  rationale?: string | null;
};

export type AiQuoteDraftActionState = {
  error?: string;
  draft?: AiQuoteDraft;
};
