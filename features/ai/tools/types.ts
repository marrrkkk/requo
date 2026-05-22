/**
 * AI Assistant Tool System — Type Definitions
 *
 * Tools allow the AI assistant to query the database and perform
 * read-only operations to answer user questions accurately.
 */

export type AiToolParameterType = "string" | "number" | "boolean";

export type AiToolParameter = {
  name: string;
  type: AiToolParameterType;
  description: string;
  required: boolean;
  enum?: string[];
};

export type AiToolDefinition = {
  name: string;
  description: string;
  parameters: AiToolParameter[];
};

export type AiToolCall = {
  tool: string;
  args: Record<string, unknown>;
};

export type AiToolResult = {
  tool: string;
  result: string;
  error?: boolean;
};

export type AiToolExecutionContext = {
  businessId: string;
  businessSlug: string;
  userId: string;
};
