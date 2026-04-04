export type DashboardReplySnippet = {
  id: string;
  title: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ReplySnippetFieldErrors = Partial<
  Record<"title" | "body", string[] | undefined>
>;

export type ReplySnippetActionState = {
  error?: string;
  success?: string;
  fieldErrors?: ReplySnippetFieldErrors;
};

export type ReplySnippetDeleteActionState = {
  error?: string;
};
