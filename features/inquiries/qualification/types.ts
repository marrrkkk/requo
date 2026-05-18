// Qualification Engine types for duplicate detection

export type DuplicateFlag = {
  originalInquiryId: string;
  reason: "email_recency" | "text_similarity" | "both";
  tokenOverlap: number | null; // percentage, null for email-only
};

export type QualificationOutput = {
  duplicate: DuplicateFlag | null;
};

/** Represents a recent inquiry for duplicate detection */
export type RecentInquiryInput = {
  id: string;
  details: string;
  submittedAt: Date;
  customerEmail: string;
};

/** Represents the inquiry fields needed by the duplicate detection orchestrator */
export type InquiryQualificationInput = {
  customerName: string | null;
  customerEmail: string | null;
  serviceCategory: string;
  requestedDeadline: string | null;
  budgetText: string | null;
  details: string;
  subject: string | null;
  submittedAt: Date;
};
