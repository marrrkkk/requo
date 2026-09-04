# Owner Assistant Tool Inventory

Comprehensive specification of all tools available to the Owner Assistant AI.

## Tool Categories

### Read Tools (Search & Analytics)
Low-risk operations that query business data without mutations.

### Write Tools (Operations)
Operations that create or modify business data. May trigger side effects (emails, notifications, automation).

### Tool Authorization Model
- All tools require authenticated user + business membership
- Business-scoped via `getBusinessActionContext()`
- Plan-gated tools fail gracefully with upgrade prompts
- High-risk tools require explicit user confirmation

---

## Read Tools

### `search_inquiries`

**Purpose**: Search and filter inquiries with flexible criteria.

**Input Schema**:
```typescript
{
  status?: 'new' | 'quoted' | 'waiting' | 'won' | 'lost' | 'archived';
  dateRange?: {
    start: string; // ISO date
    end: string;   // ISO date
  };
  customerEmail?: string;
  customerName?: string;
  aiAssisted?: boolean;
  serviceCategory?: string;
  tags?: string[];
  limit?: number;  // default: 20, max: 100
  offset?: number; // for pagination
  sortBy?: 'createdAt' | 'updatedAt' | 'customerName';
  sortOrder?: 'asc' | 'desc';
}
```

**Output Schema**:
```typescript
{
  type: 'inquiry_list';
  data: Array<{
    id: string;
    customerName: string;
    customerEmail: string;
    status: string;
    serviceCategory: string;
    source: string;
    aiAssisted: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  summary: string; // e.g., "Found 8 inquiries from the past week"
  metadata: {
    total: number;
    filtered: number;
    hasMore: boolean;
  };
}
```

**Authorization**: Requires business membership.

**Plan Gating**: None (available to all plans).

---

### `get_inquiry_stats`

**Purpose**: Aggregate statistics about inquiries.

**Input Schema**:
```typescript
{
  dateRange?: {
    start: string;
    end: string;
  };
  groupBy?: 'status' | 'source' | 'serviceCategory' | 'day' | 'week' | 'month';
}
```

**Output Schema**:
```typescript
{
  type: 'stats_summary';
  data: {
    total: number;
    byStatus: Record<string, number>;
    bySource: Record<string, number>;
    byServiceCategory: Record<string, number>;
    aiAssistedCount: number;
    aiAssistedPercentage: number;
  };
  summary: string; // e.g., "You have 47 inquiries: 12 new, 23 quoted, 8 won, 4 lost"
}
```

**Authorization**: Requires business membership.

**Plan Gating**: None.

---

### `search_quotes`

**Purpose**: Search and filter quotes.

**Input Schema**:
```typescript
{
  status?: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
  dateRange?: {
    start: string;
    end: string;
  };
  customerEmail?: string;
  customerName?: string;
  minValue?: number;
  maxValue?: number;
  inquiryId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'sentAt' | 'total' | 'customerName';
  sortOrder?: 'asc' | 'desc';
}
```

**Output Schema**:
```typescript
{
  type: 'quote_list';
  data: Array<{
    id: string;
    quoteNumber: string;
    customerName: string;
    customerEmail: string;
    status: string;
    total: number;
    currency: string;
    sentAt: string | null;
    viewedAt: string | null;
    respondedAt: string | null;
    createdAt: string;
  }>;
  summary: string;
  metadata: {
    total: number;
    filtered: number;
    totalValue: number;
    hasMore: boolean;
  };
}
```

**Authorization**: Requires business membership.

**Plan Gating**: None.

---

### `get_quote_stats`

**Purpose**: Aggregate statistics about quotes and pipeline.

**Input Schema**:
```typescript
{
  dateRange?: {
    start: string;
    end: string;
  };
  groupBy?: 'status' | 'day' | 'week' | 'month';
}
```

**Output Schema**:
```typescript
{
  type: 'stats_summary';
  data: {
    total: number;
    byStatus: Record<string, number>;
    pipelineValue: number;      // Sum of all sent/viewed quotes
    acceptedValue: number;       // Sum of accepted quotes
    averageQuoteValue: number;
    acceptanceRate: number;      // Percentage
    viewRate: number;            // Percentage of sent quotes viewed
    averageTimeToView: number;   // Hours
    averageTimeToRespond: number; // Hours
  };
  summary: string;
}
```

**Authorization**: Requires business membership.

**Plan Gating**: None (basic stats available to all).

---

### `get_conversion_analytics`

**Purpose**: Detailed conversion funnel and metrics over time.

**Input Schema**:
```typescript
{
  dateRange?: {
    start: string;
    end: string;
  };
  granularity?: 'day' | 'week' | 'month';
  includeCharts?: boolean; // default: true
}
```

**Output Schema**:
```typescript
{
  type: 'chart_data';
  data: {
    funnel: {
      inquiries: number;
      quoted: number;
      viewed: number;
      accepted: number;
    };
    conversionRates: {
      inquiryToQuote: number;
      quoteToView: number;
      viewToAccept: number;
      inquiryToAccept: number; // Overall conversion
    };
    timeSeries: Array<{
      date: string;
      inquiries: number;
      quotes: number;
      accepted: number;
      conversionRate: number;
    }>;
  };
  summary: string; // e.g., "Your overall conversion rate is 18% (8 won from 47 inquiries)"
}
```

**Authorization**: Requires business membership.

**Plan Gating**: **Pro+ required**. Returns upgrade prompt if Free plan.

---

### `get_workflow_analytics`

**Purpose**: Operational efficiency metrics (time-to-quote, response times, bottlenecks).

**Input Schema**:
```typescript
{
  dateRange?: {
    start: string;
    end: string;
  };
  includeCharts?: boolean;
}
```

**Output Schema**:
```typescript
{
  type: 'chart_data';
  data: {
    averageTimeToQuote: number;      // Hours from inquiry to quote sent
    medianTimeToQuote: number;
    averageTimeToFirstView: number;  // Hours from quote sent to viewed
    averageTimeToResponse: number;   // Hours from quote sent to customer response
    bottlenecks: Array<{
      stage: string; // e.g., "inquiry → quoted"
      averageTime: number;
      slowestCases: Array<{inquiryId: string; timeSpent: number}>;
    }>;
    timeSeries: Array<{
      date: string;
      avgTimeToQuote: number;
      avgResponseTime: number;
    }>;
  };
  summary: string;
}
```

**Authorization**: Requires business membership.

**Plan Gating**: **Business plan required**. Returns upgrade prompt if Free/Pro.

---

### `search_customers`

**Purpose**: Find customers across inquiries and quotes.

**Input Schema**:
```typescript
{
  email?: string;
  name?: string;
  hasInquiries?: boolean;
  hasQuotes?: boolean;
  hasAcceptedQuotes?: boolean;
  limit?: number;
  offset?: number;
}
```

**Output Schema**:
```typescript
{
  type: 'customer_list';
  data: Array<{
    email: string;
    name: string;
    inquiryCount: number;
    quoteCount: number;
    acceptedQuoteCount: number;
    totalSpent: number;
    lastContactDate: string;
    inquiries: Array<{id: string; status: string; createdAt: string}>;
    quotes: Array<{id: string; status: string; total: number; createdAt: string}>;
  }>;
  summary: string;
  metadata: {
    total: number;
    hasMore: boolean;
  };
}
```

**Note**: Customers are not a first-class entity; data is aggregated from inquiries/quotes on the fly.

**Authorization**: Requires business membership.

**Plan Gating**: None.

---

### `search_knowledge`

**Purpose**: RAG search over business memory (knowledge base).

**Input Schema**:
```typescript
{
  query: string;
  categories?: Array<'business_rules' | 'customer_context' | 'workflow_preferences' | 'pricing_knowledge'>;
  limit?: number; // default: 5, max: 10
}
```

**Output Schema**:
```typescript
{
  type: 'knowledge_results';
  data: Array<{
    id: string;
    title: string;
    content: string; // Truncated excerpt
    category: string;
    relevanceScore: number;
    createdAt: string;
  }>;
  summary: string; // e.g., "Found 3 relevant knowledge entries"
}
```

**Authorization**: Requires business membership.

**Plan Gating**: **Pro+ required** (knowledge base feature).

---

### `get_follow_up_stats`

**Purpose**: Statistics about follow-ups (pending, overdue, completed, skipped, completion rate). Counts come from the business's `follow_ups` table (soft-deleted excluded); overdue is derived as pending with a past due date.

**Input Schema**:
```typescript
{
  status?: 'pending' | 'completed' | 'skipped' | 'overdue';
  dateRange?: {
    start: string;
    end: string;
  };
}
```

**Output Schema** (renders as `<StatsSummaryCard>`):
```typescript
{
  type: 'stats_summary';
  data: {
    stats: Array<{ label: string; value: number; format?: 'number' | 'currency' | 'percent' }>;
  };
  summary: string;
}
```

**Authorization**: Requires business membership.

**Plan Gating**: None — the Assistant is available on every plan; volume is governed by the daily message bucket.

---

## Write Tools

### `create_inquiry`

**Purpose**: Manually create an inquiry (like manual entry in dashboard).

**Risk Level**: **Low** (auto-execute).

**Input Schema**:
```typescript
{
  customerName: string;
  customerEmail: string;
  customerContactMethod?: 'email' | 'phone' | 'other';
  customerContactHandle?: string;
  serviceCategory: string;
  details: string;
  requestedDeadline?: string; // ISO date
  budgetText?: string;
  tags?: string[];
  internalNotes?: string;
}
```

**Output Schema**:
```typescript
{
  type: 'inquiry_created';
  data: {
    id: string;
    customerName: string;
    customerEmail: string;
    status: 'new';
    createdAt: string;
  };
  summary: string; // e.g., "Created inquiry #789 for John Smith"
}
```

**Implementation**: Reuses `createInquirySubmission()` service with `source: 'manual'`.

**Authorization**: Requires business membership + `canManageInquiries()` (all roles by default).

**Plan Gating**: None.

**Audit**: Logs `owner_assistant.create_inquiry` action.

---

### `create_quote`

**Purpose**: Create a quote from an inquiry or from scratch.

**Risk Level**: **Low** (auto-execute, no external side effects).

**Input Schema**:
```typescript
{
  inquiryId?: string; // If creating from inquiry
  customerName?: string; // Required if no inquiryId
  customerEmail?: string; // Required if no inquiryId
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    productId?: string; // If from quote library
  }>;
  notes?: string;
  validUntil?: string; // ISO date, default: 30 days
  terms?: string;
  useAiDrafting?: boolean; // Trigger AI-assisted quote generation
}
```

**Output Schema**:
```typescript
{
  type: 'quote_created';
  data: {
    id: string;
    quoteNumber: string;
    customerName: string;
    total: number;
    currency: string;
    status: 'draft';
    createdAt: string;
  };
  summary: string; // e.g., "Created Quote #123 for John Smith ($1,250.00)"
}
```

**Implementation**: Reuses existing quote creation service. If `useAiDrafting: true`, calls AI quote drafting feature (plan-gated).

**Authorization**: Requires business membership + `canManageQuotes()`.

**Plan Gating**: AI drafting requires Pro+ (`aiQuoteDrafting` feature).

**Audit**: Logs `owner_assistant.create_quote` action.

---

### `update_inquiry_status`

**Purpose**: Transition inquiry lifecycle (new → quoted → won/lost).

**Risk Level**: **Mixed**
- Low-risk: `new` → `quoted`, `quoted` → `waiting`
- High-risk: Any transition to `won`/`lost` (may trigger automation, affects analytics)

**Confirmation Required**: Transitions to `won` or `lost`.

**Input Schema**:
```typescript
{
  inquiryId: string;
  newStatus: 'quoted' | 'waiting' | 'won' | 'lost' | 'archived';
  notes?: string; // Optional internal note
}
```

**Output Schema**:
```typescript
{
  type: 'inquiry_updated';
  data: {
    id: string;
    customerName: string;
    oldStatus: string;
    newStatus: string;
    updatedAt: string;
  };
  summary: string; // e.g., "Updated inquiry #789 status to 'won'"
}
```

**Confirmation Prompt** (for won/lost):
```
"Mark inquiry #{id} from {customerName} as {newStatus}? This will affect your analytics and may trigger automation."
```

**Authorization**: Requires business membership + `canManageInquiries()`.

**Plan Gating**: None.

**Audit**: Logs `owner_assistant.update_inquiry_status` action.

---

### `send_quote`

**Purpose**: Send a quote to the customer via email or generate shareable link.

**Risk Level**: **High** (triggers email delivery, customer notification, external side effect).

**Confirmation Required**: Yes.

**Input Schema**:
```typescript
{
  quoteId: string;
  deliveryMethod: 'email' | 'link';
  emailTemplate?: string; // Template ID (if delivery via email)
  customMessage?: string; // Optional personal message
}
```

**Output Schema**:
```typescript
{
  type: 'quote_sent';
  data: {
    id: string;
    quoteNumber: string;
    customerEmail: string;
    deliveryMethod: string;
    sentAt: string;
    publicLink?: string; // If delivery method is 'link' or always include
  };
  summary: string; // e.g., "Sent Quote #123 to john@example.com"
}
```

**Confirmation Prompt**:
```
"Send Quote #{quoteNumber} to {customerEmail} via {deliveryMethod}? This will notify the customer."
```

**Implementation**: Reuses existing quote delivery service. Checks idempotency (don't send twice unless explicitly re-sent).

**Authorization**: Requires business membership + `canManageQuotes()`.

**Plan Gating**: Custom email templates require Pro+ (`emailTemplates` feature). Falls back to default template if unavailable.

**Audit**: Logs `owner_assistant.send_quote` action.

---

### `schedule_follow_up`

**Purpose**: Create a follow-up reminder for an inquiry or quote.

**Risk Level**: **High** (creates commitments, may trigger notifications/emails).

**Confirmation Required**: Yes (for auto follow-ups that trigger emails).

**Input Schema**:
```typescript
{
  resourceType: 'inquiry' | 'quote';
  resourceId: string;
  scheduledFor: string; // ISO datetime
  message?: string; // Follow-up message (optional, can use template)
  autoSend?: boolean; // If true, automatically send on scheduled date
  reminderDays?: number; // Send reminder N days before
}
```

**Output Schema**:
```typescript
{
  type: 'follow_up_scheduled';
  data: {
    id: string;
    resourceType: string;
    resourceId: string;
    scheduledFor: string;
    autoSend: boolean;
    createdAt: string;
  };
  summary: string; // e.g., "Scheduled follow-up for Quote #123 on March 15"
}
```

**Confirmation Prompt** (if autoSend: true):
```
"Schedule automatic follow-up for {resourceType} #{resourceId} on {scheduledFor}? This will send an email to the customer."
```

**Implementation**: Reuses existing follow-up service. If `autoSend: true`, creates auto follow-up (triggers Inngest job).

**Authorization**: Requires business membership + `canManageFollowUps()`.

**Plan Gating**: **Pro+ required** (`followUps` feature). Auto follow-ups may have additional gating (`autoFollowUps` on Business plan).

**Audit**: Logs `owner_assistant.schedule_follow_up` action.

---

## Error Handling

All tools return standardized error responses:

```typescript
{
  type: 'error';
  error: 'PLAN_LIMIT' | 'PERMISSION_DENIED' | 'NOT_FOUND' | 'VALIDATION_ERROR' | 'RATE_LIMIT' | 'INTERNAL_ERROR';
  message: string; // Human-readable error
  details?: any;   // Additional context
  upgradeUrl?: string; // If plan-gated feature
  retryable?: boolean; // If error is transient
}
```

### Error Types

- **PLAN_LIMIT**: User's plan doesn't include required feature. Include `upgradeUrl`.
- **PERMISSION_DENIED**: User lacks role-based permission. Message explains required role.
- **NOT_FOUND**: Resource (inquiry, quote, etc.) doesn't exist or doesn't belong to business.
- **VALIDATION_ERROR**: Invalid input parameters. Include `details` with field-level errors.
- **RATE_LIMIT**: User/business exceeded rate limit. Include `retryAfter` timestamp.
- **INTERNAL_ERROR**: Unexpected server error. Log for debugging, show generic message to user.

---

## Tool Execution Flow

### Low-Risk Tools (Auto-Execute)
1. User sends message with intent
2. LLM selects tool and parameters
3. Server validates authorization + plan access
4. Tool executes immediately
5. Result returned to LLM
6. LLM generates natural language response

### High-Risk Tools (Confirmation Required)
1. User sends message with intent
2. LLM selects tool and parameters
3. Server validates authorization + plan access
4. Tool **prepares** operation (doesn't execute)
5. Return confirmation request to UI
6. UI displays confirmation prompt with details
7. User confirms or cancels
8. If confirmed, tool executes
9. Result returned to LLM
10. LLM generates response

### Multi-Step Operations
LLM can chain tools autonomously:
```
User: "Create a quote for John Smith's inquiry and send it"
→ Tool: search_inquiries({customerName: "John Smith"})
→ Result: Found inquiry #789
→ Tool: create_quote({inquiryId: "789", lineItems: [...]})
→ Result: Quote #123 created
→ Confirmation: "Send Quote #123 to john@example.com?"
→ User confirms
→ Tool: send_quote({quoteId: "123", deliveryMethod: "email"})
→ Result: Quote sent
→ Assistant: "I've created and sent Quote #123 to John Smith."
```

---

## Implementation Checklist

For each tool:
- [ ] Define input schema (Zod)
- [ ] Define output schema (TypeScript interface)
- [ ] Implement authorization checks
- [ ] Implement plan gating (if applicable)
- [ ] Implement business scoping (filter by businessId)
- [ ] Add confirmation logic (if high-risk)
- [ ] Add audit logging
- [ ] Write unit tests (schema validation, authorization)
- [ ] Write integration tests (execution, plan limits, business scoping)
- [ ] Document in system prompt

---

## Future Tools (V2+)

Potential additions after V1 validation:

- `update_quote`: Modify existing quote (line items, pricing)
- `archive_inquiry`: Bulk archive old inquiries
- `export_data`: Generate CSV/JSON export of inquiries/quotes
- `get_customer_history`: Detailed customer interaction timeline
- `create_product`: Add entry to quote library
- `get_business_insights`: AI-generated insights (trends, recommendations)
- `draft_follow_up_message`: AI-assisted follow-up drafting
- `bulk_update_statuses`: Update multiple inquiries at once
- `create_inquiry_from_email`: Parse email thread into inquiry
- `compare_periods`: Compare metrics across date ranges

These require additional UX design, validation, and testing before implementation.
