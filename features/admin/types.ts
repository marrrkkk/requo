/**
 * Admin console domain types.
 *
 * Row shapes and detail shapes for the admin read queries. Keeps the
 * type surface colocated with the feature so `features/admin/queries.ts`,
 * `features/admin/components/**`, and `features/admin/mutations.ts` can
 * share them without reaching into schemas.
 */

import type {
  AdminAction,
  AdminAiProviderId,
  AdminTargetType,
} from "@/features/admin/constants";
import type { InquiryStatus } from "@/features/inquiries/types";
import type { QuoteStatus } from "@/features/quotes/types";
import type { EmailOutboxStatus } from "@/lib/db/schema/email";
import type { BusinessMemberRole } from "@/lib/business-members";
import type {
  BillingCurrency,
  BillingProvider,
  PaymentAttemptStatus,
  SubscriptionStatus,
} from "@/lib/billing/types";
import type { BusinessPlan } from "@/lib/plans/plans";

/** Minimal row shape rendered by `AdminUsersTable`. */
export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  banned: boolean;
  banReason: string | null;
  role: string | null;
  createdAt: Date;
  lastSessionAt: Date | null;
};

/** Summary of a target user's account subscription for the detail view. */
export type AdminUserDetailSubscription = {
  /**
   * `account_subscriptions.id` — required by `forceCancelSubscriptionAction`,
   * which is subscription-keyed even though the service itself is user-keyed.
   */
  id: string;
  plan: BusinessPlan;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
};

/** A business owned by a target user, surfaced on the user detail page. */
export type AdminUserDetailBusiness = {
  id: string;
  name: string;
  slug: string;
  plan: BusinessPlan;
};

/** Full detail payload rendered by `AdminUserDetail`. */
export type AdminUserDetail = AdminUserRow & {
  subscription: AdminUserDetailSubscription | null;
  ownedBusinesses: AdminUserDetailBusiness[];
  activeSessionCount: number;
  recentAuditLogs: AdminAuditLogRow[];
  /**
   * Whether the target (if an admin) is safe to demote — false when the
   * target is the last remaining admin, guarding against lockout.
   */
  canDemoteTarget: boolean;
};

/** Row shape rendered by `AdminBusinessesTable`. */
export type AdminBusinessRow = {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string;
  plan: BusinessPlan;
  memberCount: number;
  createdAt: Date;
};

/** Row shape rendered by `AdminSubscriptionsTable`. */
export type AdminSubscriptionRow = {
  id: string;
  userId: string;
  ownerEmail: string;
  plan: string;
  status: SubscriptionStatus;
  provider: BillingProvider;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
};

/** Row shape rendered by `AdminAuditTable` and nested in user detail. */
export type AdminAuditLogRow = {
  id: string;
  adminUserId: string | null;
  adminEmail: string;
  action: AdminAction;
  targetType: AdminTargetType;
  targetId: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
};

/** Pagination envelope returned by every admin list query. */
export type AdminPaginatedResult<T> = {
  items: T[];
  total: number;
};

/** Envelope returned by every admin server action. */
export type AdminActionResult<T = void> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/** Counts rendered on the admin landing dashboard. */
export type AdminDashboardCounts = {
  totalUsers: number;
  totalBusinesses: number;
  /**
   * Count of `account_subscriptions` rows whose `status = 'active'`,
   * keyed by `plan`. Plans that have zero active subscriptions are
   * absent from the map rather than mapped to `0`.
   */
  activeSubscriptionsByPlan: Record<string, number>;
  totalActiveSubscriptions: number;
  signUpsLast7d: number;
  inquiriesLast7d: number;
  quotesSentLast7d: number;
};

/** Full payload rendered by `AdminBusinessDetail`. */
export type AdminBusinessDetail = AdminBusinessRow & {
  ownerUserId: string;
  ownerName: string;
  members: Array<{
    userId: string;
    email: string;
    name: string;
    role: BusinessMemberRole;
    joinedAt: Date;
  }>;
  inquiryCount: number;
  quoteCount: number;
  lastInquiryAt: Date | null;
  lastQuoteSentAt: Date | null;
  archivedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Summary row for a recent payment attempt displayed on subscription detail. */
export type AdminSubscriptionPaymentAttempt = {
  id: string;
  plan: string;
  provider: BillingProvider;
  providerPaymentId: string;
  amount: number;
  currency: BillingCurrency;
  status: PaymentAttemptStatus;
  createdAt: Date;
};

/** Summary row for a recent billing event displayed on subscription detail. */
export type AdminSubscriptionBillingEvent = {
  id: string;
  providerEventId: string;
  provider: BillingProvider;
  eventType: string;
  processedAt: Date | null;
  createdAt: Date;
};

/** Full payload rendered by `AdminBillingPanel`. */
export type AdminSubscriptionDetail = AdminSubscriptionRow & {
  billingCurrency: BillingCurrency;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  providerCheckoutId: string | null;
  paymentMethod: string | null;
  currentPeriodStart: Date | null;
  trialEndsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  recentPaymentAttempts: AdminSubscriptionPaymentAttempt[];
  recentBillingEvents: AdminSubscriptionBillingEvent[];
};

/* ── Overview ────────────────────────────────────────────────────────────── */

/**
 * Counts for one status enum.
 *
 * Every status is present in `byStatus` — the query zero-fills the ones with no
 * rows — so the UI can render a complete breakdown without having to guess
 * which keys are missing.
 */
export type AdminStatusBreakdown<Status extends string> = {
  total: number;
  byStatus: Record<Status, number>;
};

/** Inquiry pipeline across every business, excluding soft-deleted rows. */
export type AdminOverviewInquiries = AdminStatusBreakdown<InquiryStatus>;

/** Quote pipeline across every business, excluding soft-deleted rows. */
export type AdminOverviewQuotes = AdminStatusBreakdown<QuoteStatus>;

/** Transactional email throughput for the trailing 24-hour and 7-day windows. */
export type AdminOverviewEmail = {
  last24h: AdminStatusBreakdown<EmailOutboxStatus>;
  last7d: AdminStatusBreakdown<EmailOutboxStatus>;
};

/** AI spend and reliability for the trailing 24 hours. */
export type AdminOverviewAi = {
  calls: number;
  errors: number;
  totalTokens: number;
  /**
   * Sum of `estimated_cost_cents` over the window. Only priced rows
   * contribute — read `unpricedCalls` before presenting this as the true
   * spend, because an unpriced model silently contributes zero.
   */
  estimatedCostCents: number;
  /** Calls whose model had no price entry in the catalog. */
  unpricedCalls: number;
  cacheHits: number;
  /** Null when no call was recorded in the window. */
  averageLatencyMs: number | null;
};

/** Every aggregate the Overview page renders. */
export type AdminOverviewMetrics = {
  inquiries: AdminOverviewInquiries;
  quotes: AdminOverviewQuotes;
  email: AdminOverviewEmail;
  ai: AdminOverviewAi;
};

/** Which product surface produced a row in the Overview activity feed. */
export type AdminRecentActivityKind = "audit" | "inquiry" | "quote" | "email";
/**
 * One merged row of the Overview activity feed.
 *
 * The feed is assembled from four unrelated tables, so each item carries a
 * pre-formatted `title`/`subtitle` and its own deep link rather than exposing
 * a union of row shapes to the UI.
 */
export type AdminRecentActivityItem = {
  /** Source row id — unique across the feed because kinds are namespaced in. */
  id: string;
  kind: AdminRecentActivityKind;
  title: string;
  subtitle: string | null;
  occurredAt: Date;
  /** Admin-console deep link, or null when the row has no detail page yet. */
  href: string | null;
};

/* ── Billing ─────────────────────────────────────────────────────────────── */

/**
 * Complete billing picture for one user.
 *
 * `subscription` is the full `account_subscriptions` row (or null when the
 * user never left the free plan) — it already carries the recent payment
 * attempts and billing events, so the billing panel has everything from
 * this single payload.
 */
export type AdminUserBillingActivity = {
  subscription: AdminSubscriptionDetail | null;
};

/** Compact `business_subscriptions` row for the business billing section. */
export type AdminBusinessSubscriptionSummary = {
  id: string;
  plan: string;
  status: SubscriptionStatus;
  provider: BillingProvider;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
};

/**
 * Every plan signal for one business, each labelled distinctly.
 *
 * Admin reads `account_subscriptions` while runtime plan resolution reads
 * `business_subscriptions`, and the two can disagree — so the UI must
 * present `effectivePlan` ("effective, cached"), `accountSubscription`
 * ("account subscription"), and `businessSubscription` as three separate
 * facts and never claim a single source of truth.
 */
export type AdminBusinessBilling = {
  businessId: string;
  /** Denormalized read cache on `businesses` — what the product enforces. */
  effectivePlan: BusinessPlan;
  ownerUserId: string;
  ownerEmail: string;
  /** The owner's full `account_subscriptions` detail, or null when free. */
  accountSubscription: AdminSubscriptionDetail | null;
  /** The business-scoped subscription row, or null when free. */
  businessSubscription: AdminBusinessSubscriptionSummary | null;
};

/* ── Product (inquiries) ─────────────────────────────────────────────────── */

/** Minimal row shape rendered by the admin inquiries table. */
export type AdminInquiryRow = {
  id: string;
  subject: string | null;
  customerName: string;
  customerEmail: string | null;
  status: InquiryStatus;
  submittedAt: Date;
  businessId: string;
  businessName: string;
};

export type AdminInquiryMessage = {
  id: string;
  role: string;
  content: string;
  status: string;
  createdAt: Date;
};

export type AdminInquiryNote = {
  id: string;
  body: string;
  authorName: string | null;
  authorEmail: string | null;
  createdAt: Date;
};

export type AdminInquiryAttachment = {
  id: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  createdAt: Date;
};

export type AdminInquiryLinkedQuote = {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  totalInCents: number;
  currency: string;
  sentAt: Date | null;
};

/**
 * Full payload rendered by the admin inquiry detail view.
 *
 * Attachments are metadata only — `storagePath` is deliberately excluded
 * because private asset access stays server-side and scoped to the
 * business.
 */
export type AdminInquiryDetail = {
  id: string;
  businessId: string;
  subject: string | null;
  customerName: string;
  customerEmail: string | null;
  customerContactMethod: string;
  customerContactHandle: string;
  serviceCategory: string | null;
  requestedDeadline: string | null;
  budgetText: string | null;
  details: string;
  source: string | null;
  quoteRequested: boolean;
  status: InquiryStatus;
  submittedAt: Date;
  lastRespondedAt: Date | null;
  archivedAt: Date | null;
  deletedAt: Date | null;
  qualificationScore: number | null;
  qualificationTemperature: string | null;
  aiAssisted: boolean;
  escalated: boolean;
  business: {
    id: string;
    name: string;
    slug: string;
    plan: BusinessPlan;
  };
  owner: {
    userId: string;
    name: string;
    email: string;
  };
  messages: AdminInquiryMessage[];
  notes: AdminInquiryNote[];
  attachments: AdminInquiryAttachment[];
  linkedQuotes: AdminInquiryLinkedQuote[];
};

/* ── Product (quotes) ────────────────────────────────────────────────────── */

/** Minimal row shape rendered by the admin quotes table. */
export type AdminQuoteRow = {
  id: string;
  quoteNumber: string;
  title: string;
  customerName: string;
  customerEmail: string | null;
  status: QuoteStatus;
  totalInCents: number;
  currency: string;
  sentAt: Date | null;
  createdAt: Date;
  businessId: string;
  businessName: string;
};

export type AdminQuoteItem = {
  id: string;
  description: string;
  quantity: number;
  unitPriceInCents: number;
  lineTotalInCents: number;
  position: number;
};

export type AdminQuoteVersion = {
  id: string;
  version: number;
  title: string;
  totalInCents: number;
  currency: string;
  validUntil: string;
  createdAt: Date;
};

export type AdminQuoteRevisionRequest = {
  id: string;
  version: number;
  message: string | null;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
};

export type AdminQuoteEmail = {
  id: string;
  subject: string;
  status: EmailOutboxStatus;
  provider: string | null;
  sentAt: Date | null;
  createdAt: Date;
  attempts: number;
};

/**
 * Full payload rendered by the admin quote detail view.
 *
 * `emails` are the `email_outbox` rows whose idempotency key ties them to
 * this quote (`quote:<id>:sent:*` + `auto-followup:<id>:attempt:*`). Together
 * with `sentAt` / `publicViewedAt` / `customerRespondedAt` they answer
 * whether the quote actually reached the customer — including the manual
 * link-share path, which sets `sentAt` without sending any email.
 */
export type AdminQuoteDetail = {
  id: string;
  businessId: string;
  inquiryId: string | null;
  quoteNumber: string;
  title: string;
  customerName: string;
  customerEmail: string | null;
  customerContactMethod: string;
  customerContactHandle: string;
  status: QuoteStatus;
  currency: string;
  notes: string | null;
  terms: string | null;
  subtotalInCents: number;
  discountInCents: number;
  taxInCents: number;
  totalInCents: number;
  sentAt: Date | null;
  acceptedAt: Date | null;
  publicViewedAt: Date | null;
  customerRespondedAt: Date | null;
  customerResponseMessage: string | null;
  validUntil: string;
  version: number;
  autoFollowUp: {
    enabled: boolean;
    delayDays: number;
    maxAttempts: number;
    attempts: number;
    lastSentAt: Date | null;
    stoppedAt: Date | null;
  };
  createdAt: Date;
  updatedAt: Date;
  business: {
    id: string;
    name: string;
    slug: string;
    plan: BusinessPlan;
  };
  linkedInquiry: {
    id: string;
    subject: string | null;
    customerName: string;
    status: InquiryStatus;
  } | null;
  items: AdminQuoteItem[];
  versions: AdminQuoteVersion[];
  revisionRequests: AdminQuoteRevisionRequest[];
  emails: AdminQuoteEmail[];
};

/* ── AI ──────────────────────────────────────────────────────────────────── */

/** Aggregate AI usage for one trailing window (24h or 7d). */
export type AdminAiWindowStats = {
  requests: number;
  tokens: number;
  /**
   * Sum of `estimated_cost_cents` over the window — a floor, not the real
   * spend. Unpriced models log NULL, which `sum()` skips; read
   * `unpricedCalls` before presenting this as the true cost.
   */
  estimatedCostCents: number;
  /** Calls whose model had no price entry in the catalog. */
  unpricedCalls: number;
  errors: number;
  cacheHits: number;
  /** Null when no call was recorded in the window. */
  averageLatencyMs: number | null;
};

export type AdminAiProviderBreakdown = {
  provider: string;
  requests: number;
  tokens: number;
  errors: number;
};

export type AdminAiTaskBreakdown = {
  taskType: string;
  requests: number;
  tokens: number;
  errors: number;
};

export type AdminAiSessionBreakdown = {
  status: string;
  count: number;
};

/** Every aggregate the AI overview page renders. */
export type AdminAiOverview = {
  last24h: AdminAiWindowStats;
  last7d: AdminAiWindowStats;
  byProvider: AdminAiProviderBreakdown[];
  byTaskType: AdminAiTaskBreakdown[];
  securityEventsLast7d: number;
  agentSessionsByStatus: AdminAiSessionBreakdown[];
};

/** Minimal row shape rendered by the admin AI requests table. */
export type AdminAiRequestRow = {
  id: string;
  provider: string;
  model: string;
  taskType: string;
  status: string;
  totalTokens: number;
  estimatedCostCents: number | null;
  cacheHit: boolean;
  latencyMs: number;
  errorMessage: string | null;
  businessId: string;
  createdAt: Date;
};

/** Failed `ai_token_logs` row for the AI errors page. */
export type AdminAiErrorRow = {
  id: string;
  provider: string;
  model: string;
  taskType: string;
  /** Provider error string, truncated to 1024 chars. No prompts/responses. */
  errorMessage: string | null;
  createdAt: Date;
};

export type AdminAiSecurityEvent = {
  id: string;
  eventType: string;
  patternMatched: string | null;
  businessId: string | null;
  createdAt: Date;
};

export type AdminAiErrorsResult = {
  items: AdminAiErrorRow[];
  total: number;
  securityEvents: AdminAiSecurityEvent[];
};

export type AdminAiProvider = {
  id: AdminAiProviderId;
  label: string;
  /** Whether the provider's credentials are present in env. */
  configured: boolean;
};

export type AdminAiRoutingProfile = {
  name: string;
  needsTools: boolean;
  minQuality: number;
  /** Ordered model ids, first = preferred. */
  order: string[];
  excludedProviders: string[];
  reasoning: string;
};

export type AdminAiProviders = {
  providers: AdminAiProvider[];
  profiles: AdminAiRoutingProfile[];
};

/** Trimmed live-capacity row for one catalog model. */
export type AdminAiCapacityEntry = {
  modelId: string;
  loadRatio: number;
  minuteUsage: number;
  dayUsage: number;
  available: boolean;
};

/* ── Operations (emails) ─────────────────────────────────────────────────── */

/** Minimal row shape rendered by the admin emails table. */
export type AdminEmailRow = {
  id: string;
  subject: string;
  type: string;
  status: EmailOutboxStatus;
  provider: string | null;
  /** First recipient, or null when the `to` array is empty. */
  recipient: string | null;
  businessId: string | null;
  businessName: string | null;
  senderEmail: string | null;
  sentAt: Date | null;
  createdAt: Date;
};

export type AdminEmailAttempt = {
  id: string;
  provider: string;
  status: string;
  errorMessage: string | null;
  retryable: boolean;
  createdAt: Date;
};

/**
 * Full payload rendered by the admin email detail view.
 *
 * Privacy contract: `cc`/`bcc` are never selected. `html`/`textBody` are
 * only loaded when `type !== "auth"` — for auth emails both stay null and
 * `bodyRedacted` is true, so verification codes and magic links can never
 * reach the browser.
 */
export type AdminEmailDetail = {
  id: string;
  businessId: string | null;
  businessName: string | null;
  type: string;
  recipients: string[];
  subject: string;
  html: string | null;
  textBody: string | null;
  bodyRedacted: boolean;
  status: EmailOutboxStatus;
  provider: string | null;
  providerMessageId: string | null;
  attempts: number;
  lastError: string | null;
  idempotencyKey: string;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  timeline: AdminEmailAttempt[];
};

/* ── Operations (usage) ──────────────────────────────────────────────────── */

export const ADMIN_USAGE_RESOURCES = [
  "signups",
  "businesses",
  "inquiries",
  "quotes",
  "emails",
  "aiCalls",
] as const;

export type AdminUsageResource = (typeof ADMIN_USAGE_RESOURCES)[number];

/** Resources attributable to a business (for the top-consumers table). */
export const ADMIN_USAGE_BUSINESS_RESOURCES = [
  "inquiries",
  "quotes",
  "emails",
  "aiCalls",
] as const;

export type AdminUsageBusinessResource =
  (typeof ADMIN_USAGE_BUSINESS_RESOURCES)[number];

export type AdminUsageDay = {
  /** `YYYY-MM-DD` (UTC). */
  date: string;
  signups: number;
  businesses: number;
  inquiries: number;
  quotesSent: number;
  emailsSent: number;
  aiCalls: number;
};

export type AdminUsageReport = {
  days: number;
  /** Inclusive UTC range actually queried. */
  from: string;
  to: string;
  series: AdminUsageDay[];
  totals: Record<AdminUsageResource, number>;
};

export type AdminUsageBusinessRow = {
  businessId: string;
  businessName: string;
  count: number;
};
