import type { PublicInquiryBusiness } from "@/features/inquiries/types";

export type InquiryPreviewDraftSnapshot = PublicInquiryBusiness;

export type InquiryPreviewDraftPayload = {
  snapshot: InquiryPreviewDraftSnapshot;
  updatedAt: number;
};

const inquiryPreviewDraftStoragePrefix = "requo:inquiry-preview-draft:";
const inquiryPreviewDraftChannelPrefix = "requo:inquiry-preview-channel:";
const inquiryPreviewTabPrefix = "requo:inquiry-preview-tab:";

export function getInquiryPreviewDraftStorageKey(sessionId: string) {
  return `${inquiryPreviewDraftStoragePrefix}${sessionId}`;
}

export function getInquiryPreviewDraftChannelName(sessionId: string) {
  return `${inquiryPreviewDraftChannelPrefix}${sessionId}`;
}

export function getInquiryPreviewTabName(formId: string) {
  return `${inquiryPreviewTabPrefix}${formId}`;
}
