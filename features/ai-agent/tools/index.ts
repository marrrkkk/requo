/**
 * AI Agent Tools Registry
 *
 * Central export for all agent tools.
 */

import { searchKnowledgeTool } from "./search-knowledge";
import { getBusinessInfoTool } from "./get-business-info";
import { getServicesTool } from "./get-services";
import { createInquiryTool } from "./create-inquiry";
import { requestHumanHandoffTool } from "./request-human-handoff";

export const agentTools = {
  search_knowledge: searchKnowledgeTool,
  get_business_info: getBusinessInfoTool,
  get_services: getServicesTool,
  create_inquiry: createInquiryTool,
  request_human_handoff: requestHumanHandoffTool,
};

export type AgentTools = typeof agentTools;
