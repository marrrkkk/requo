/**
 * AI Agent Types
 *
 * Type definitions for the conversational inquiry collection agent.
 */

import type { aiAgentSessions, aiAgentMessages, aiAgentRuns } from "@/lib/db/schema/ai-agent";

// Database row types
export type AgentSession = typeof aiAgentSessions.$inferSelect;
export type AgentMessage = typeof aiAgentMessages.$inferSelect;
export type AgentRun = typeof aiAgentRuns.$inferSelect;

// Session status
export type SessionStatus = "active" | "completed" | "human_handoff" | "abandoned";

// Message role
export type MessageRole = "user" | "assistant" | "tool" | "system";

// Run status
export type RunStatus = "running" | "completed" | "failed";

// Agent tone options
export type AgentTone = "friendly" | "professional" | "casual";

// Agent configuration (stored in businesses.ai_agent_config)
export type AgentConfig = {
  tone?: AgentTone;
  handoffTriggers?: {
    maxSearchAttempts?: number;
    keywords?: string[];
  };
};

// Qualification state (stored in session.state)
export type QualificationState = {
  collected: Record<string, boolean>; // Which fields have been collected
  values: Record<string, string | null>; // The actual values
  missing: string[]; // Which fields are still needed
};

// Session metadata
export type SessionMetadata = {
  userAgent?: string;
  ipAddress?: string;
  handoffReason?: string;
  handoffRecommendation?: string;
  searchAttempts?: number;
  [key: string]: unknown;
};

// Message metadata
export type MessageMetadata = {
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  [key: string]: unknown;
};

// Run metadata
export type RunMetadata = {
  toolCalls?: Array<{
    toolName: string;
    toolCallId: string;
    args: unknown;
    result: unknown;
  }>;
  stepCount?: number;
  [key: string]: unknown;
};

// Session creation result
export type SessionCreateResult = {
  sessionId: string;
  publicToken: string;
  expiresAt: Date;
};

// Agent run context for tools
export type AgentToolContext = {
  sessionId: string;
  businessId: string;
  business: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    shortDescription: string | null;
    contactEmail: string | null;
    inquiryFormConfig: unknown;
  };
  state: QualificationState;
};

// Tool execution result types
export type ToolResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Search knowledge tool result
export type SearchKnowledgeResult = {
  found: boolean;
  results?: Array<{
    content: string;
    relevance: number;
    source?: string;
  }>;
  message?: string;
};

// Get business info result
export type BusinessInfoResult = {
  name: string;
  description?: string;
  contact?: string;
  services?: string[];
};

// Get services result
export type ServicesResult = {
  services: Array<{
    value: string;
    label: string;
  }>;
};

// Create inquiry result
export type CreateInquiryResult = {
  inquiryId: string;
  message: string;
};

// Request handoff result
export type RequestHandoffResult = {
  handoffRequested: true;
  message: string;
};
