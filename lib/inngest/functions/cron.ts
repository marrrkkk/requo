import { inngest } from "@/lib/inngest/client";
import { cleanupTokenLogs } from "@/features/ai/inngest/token-log-cleanup";
import { computeAnalyticsBenchmarks } from "@/features/analytics/jobs/benchmarks";
import { sendAnalyticsDigestEmails } from "@/features/analytics/jobs/digest";
import { computeDailyRollups } from "@/features/analytics/jobs/rollup";
import { sendAnalyticsScheduledReports } from "@/features/analytics/jobs/scheduled-reports";
import {
  cleanupExpiredLogs,
  processScheduledJobs,
} from "@/features/automations/processor";
import { processFollowUpReminders } from "@/features/follow-ups/jobs/reminders";
import { processOverdueInvoices } from "@/features/invoices/jobs/overdue";
import { processQuoteAutoFollowUps } from "@/features/quotes/jobs/auto-follow-ups";
import { syncExpiredQuotesGlobal } from "@/features/quotes/mutations";
import { processExpiredSubscriptions } from "@/lib/billing/jobs/expire-subscriptions";

export const automationsCron = inngest.createFunction(
  {
    id: "cron-automations",
    name: "Process automation scheduled jobs",
    triggers: [{ cron: "*/5 * * * *" }],
    retries: 2,
  },
  async ({ step }) => {
    const summary = await step.run("process-scheduled-jobs", async () =>
      processScheduledJobs(),
    );
    const cleanup = await step.run("cleanup-expired-logs", async () =>
      cleanupExpiredLogs(),
    );

    return {
      ...summary,
      logsCleanedUp: cleanup.deleted,
    };
  },
);

export const followUpRemindersCron = inngest.createFunction(
  {
    id: "cron-follow-up-reminders",
    name: "Send follow-up reminders",
    triggers: [{ cron: "0 8 * * *" }],
    retries: 2,
  },
  async ({ step }) =>
    step.run("process-follow-up-reminders", async () =>
      processFollowUpReminders(),
    ),
);

export const autoFollowUpsCron = inngest.createFunction(
  {
    id: "cron-auto-follow-ups",
    name: "Send quote auto follow-ups",
    triggers: [{ cron: "0 * * * *" }],
    retries: 2,
  },
  async ({ step }) =>
    step.run("process-auto-follow-ups", async () => processQuoteAutoFollowUps()),
);

export const invoiceOverdueCron = inngest.createFunction(
  {
    id: "cron-invoice-overdue",
    name: "Mark overdue invoices",
    triggers: [{ cron: "0 9 * * *" }],
    retries: 2,
  },
  async ({ step }) =>
    step.run("process-overdue-invoices", async () => processOverdueInvoices()),
);

/**
 * @deprecated Migrated to Vercel Cron at /api/cron/expire-quotes.
 * Simple UPDATE query — no step functions, no retry logic, completes in <10s.
 * Kept here for reference; removed from cronFunctions registration.
 */
export const expireQuotesCron = inngest.createFunction(
  {
    id: "cron-expire-quotes",
    name: "Expire stale quotes",
    triggers: [{ cron: "0 1 * * *" }],
    retries: 2,
  },
  async ({ step }) =>
    step.run("sync-expired-quotes", async () => syncExpiredQuotesGlobal()),
);

/**
 * @deprecated Migrated to Vercel Cron at /api/cron/expire-subscriptions.
 * Simple UPDATE query — no step functions, no retry logic, completes in <5s.
 * Kept here for reference; removed from cronFunctions registration.
 */
export const expireSubscriptionsCron = inngest.createFunction(
  {
    id: "cron-expire-subscriptions",
    name: "Expire canceled subscriptions",
    triggers: [{ cron: "0 2 * * *" }],
    retries: 2,
  },
  async ({ step }) =>
    step.run("process-expired-subscriptions", async () =>
      processExpiredSubscriptions(),
    ),
);

export const analyticsRollupCron = inngest.createFunction(
  {
    id: "cron-analytics-rollup",
    name: "Compute analytics daily rollups",
    triggers: [{ cron: "0 4 * * *" }],
    retries: 2,
    concurrency: { limit: 1 },
  },
  async ({ step }) =>
    step.run("compute-daily-rollups", async () => computeDailyRollups()),
);

export const analyticsDigestCron = inngest.createFunction(
  {
    id: "cron-analytics-digest",
    name: "Send analytics digest emails",
    triggers: [{ cron: "0 9 * * 1" }],
    retries: 2,
    concurrency: { limit: 1 },
  },
  async ({ step }) =>
    step.run("send-analytics-digest", async () => sendAnalyticsDigestEmails()),
);

export const analyticsScheduledReportsCron = inngest.createFunction(
  {
    id: "cron-analytics-scheduled-reports",
    name: "Send scheduled analytics reports",
    triggers: [{ cron: "0 * * * *" }],
    retries: 2,
    concurrency: { limit: 1 },
  },
  async ({ step }) =>
    step.run("send-scheduled-reports", async () =>
      sendAnalyticsScheduledReports(),
    ),
);

export const analyticsBenchmarksCron = inngest.createFunction(
  {
    id: "cron-analytics-benchmarks",
    name: "Compute analytics benchmarks",
    triggers: [{ cron: "0 3 1 * *" }],
    retries: 2,
    concurrency: { limit: 1 },
  },
  async ({ step }) =>
    step.run("compute-benchmarks", async () => computeAnalyticsBenchmarks()),
);

/**
 * @deprecated Migrated to Vercel Cron at /api/cron/token-log-cleanup.
 * Simple DELETE query — no step functions, no retry logic, completes in <10s.
 * Kept here for reference; removed from cronFunctions registration.
 */
export const tokenLogCleanupCron = inngest.createFunction(
  {
    id: "cron-token-log-cleanup",
    name: "Clean up old AI token logs",
    triggers: [{ cron: "0 3 * * *" }],
    retries: 2,
  },
  async ({ step }) =>
    step.run("cleanup-token-logs", async () => cleanupTokenLogs()),
);

export const cronFunctions = [
  automationsCron,
  followUpRemindersCron,
  autoFollowUpsCron,
  invoiceOverdueCron,
  // expireQuotesCron — migrated to Vercel Cron (/api/cron/expire-quotes)
  // expireSubscriptionsCron — migrated to Vercel Cron (/api/cron/expire-subscriptions)
  analyticsRollupCron,
  analyticsDigestCron,
  analyticsScheduledReportsCron,
  analyticsBenchmarksCron,
  // tokenLogCleanupCron — migrated to Vercel Cron (/api/cron/token-log-cleanup)
];
