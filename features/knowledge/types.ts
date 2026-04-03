export type KnowledgeDocumentKind = "file" | "faq";

export type DashboardKnowledgeFile = {
  id: string;
  title: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  extractedText: string | null;
  createdAt: Date;
};

export type DashboardKnowledgeFaq = {
  id: string;
  question: string;
  answer: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
};

export type DashboardKnowledgeData = {
  files: DashboardKnowledgeFile[];
  faqs: DashboardKnowledgeFaq[];
};

export type DashboardKnowledgeSummary = {
  fileCount: number;
  faqCount: number;
  readyFileCount: number;
};

export type KnowledgeContextFile = {
  id: string;
  title: string;
  fileName: string;
  contentType: string;
  createdAt: Date;
  extractedText: string;
};

export type KnowledgeContextFaq = {
  id: string;
  question: string;
  answer: string;
  position: number;
};

export type WorkspaceKnowledgeContext = {
  faqs: KnowledgeContextFaq[];
  files: KnowledgeContextFile[];
  combinedText: string;
};

export type KnowledgeFileFieldErrors = Partial<
  Record<"title" | "file", string[] | undefined>
>;

export type KnowledgeFaqFieldErrors = Partial<
  Record<"question" | "answer", string[] | undefined>
>;

export type KnowledgeFileActionState = {
  error?: string;
  success?: string;
  fieldErrors?: KnowledgeFileFieldErrors;
};

export type KnowledgeFileDeleteActionState = {
  error?: string;
};

export type KnowledgeFaqActionState = {
  error?: string;
  success?: string;
  fieldErrors?: KnowledgeFaqFieldErrors;
};

export type KnowledgeFaqDeleteActionState = {
  error?: string;
};
