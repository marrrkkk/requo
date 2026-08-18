import { inngest } from "@/lib/inngest/client";
import { computeAnalyticsBenchmarks } from "@/features/analytics/jobs/benchmarks";
import { sendAnalyticsDigestEmails } from "@/features/analytics/jobs/digest";
import { computeDailyRollups } from "@/features/analytics/jobs/rollup";
import { sendAnalyticsScheduledReports } from "@/features/analytics/jobs/scheduled-reports";
import { processFollowUpReminders } from "@/features/follow-ups/jobs/reminders";
import { processAutoArchiveStaleInquiries } from "@/features/inquiries/jobs/auto-archive";
import { processQuoteAutoFollowUps } from "@/features/quotes/jobs/auto-follow-ups";
import { processQuoteExpiringSoon } from "@/features/quotes/jobs/expiring-soon";
import { processQuoteViewedFollowUps } from "@/features/quotes/jobs/viewed-follow-ups";
import { syncExpiredQuotesGlobal } from "@/features/quotes/mutations";
import { processExpiredSubscriptions } from "@/lib/billing/jobs/expire-subscriptions";

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

export const quoteViewedFollowUpsCron = inngest.createFunction(
  {
    id: "cron-quote-viewed-follow-ups",
    name: "Create follow-ups for viewed quotes",
    triggers: [{ cron: "0 7 * * *" }],
    retries: 2,
  },
  async ({ step }) =>
    step.run("process-viewed-follow-ups", async () =>
      processQuoteViewedFollowUps(),
    ),
);

export const quoteExpiringSoonCron = inngest.createFunction(
  {
    id: "cron-quote-expiring-soon",
    name: "Notify owners about expiring quotes",
    triggers: [{ cron: "0 8 * * *" }],
    retries: 2,
  },
  async ({ step }) =>
    step.run("process-expiring-soon", async () => processQuoteExpiringSoon()),
);

export const autoArchiveStaleInquiriesCron = inngest.createFunction(
  {
    id: "cron-auto-archive-stale-inquiries",
    name: "Archive stale inquiries",
    triggers: [{ cron: "0 3 * * *" }],
    retries: 2,
  },
  async ({ step }) =>
    step.run("process-auto-archive", async () =>
      processAutoArchiveStaleInquiries(),
    ),
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

export const cronFunctions = [
  followUpRemindersCron,
  autoFollowUpsCron,
  quoteViewedFollowUpsCron,
  quoteExpiringSoonCron,
  autoArchiveStaleInquiriesCron,
  // expireQuotesCron — migrated to Vercel Cron (/api/cron/expire-quotes)
  // expireSubscriptionsCron — migrated to Vercel Cron (/api/cron/expire-subscriptions)
  analyticsRollupCron,
  analyticsDigestCron,
  analyticsScheduledReportsCron,
  analyticsBenchmarksCron,
  // tokenLogCleanupCron — migrated to Vercel Cron (/api/cron/token-log-cleanup)
];
