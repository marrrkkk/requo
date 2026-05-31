import type { PublicInquiryChatDebugInfo } from "@/features/inquiries/public-inquiry-chat-schemas";
import type { PublicInquiryBusiness } from "@/features/inquiries/types";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
  debugInfo?: PublicInquiryChatDebugInfo;
};

export type ConversationPhase = "chatting" | "confirming" | "submitting" | "submitted";

export type ConversationalInquiryFormProps = {
  business: PublicInquiryBusiness;
  action: (
    state: { error?: string },
    formData: FormData,
  ) => Promise<{ error?: string }>;
};

export type CustomFieldMetaItem = {
  inputName: string;
  fieldId: string;
  label: string;
  required: boolean;
  fieldType: string;
};
