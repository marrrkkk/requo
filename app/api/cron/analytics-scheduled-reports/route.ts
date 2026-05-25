import { NextResponse } from "next/server";

import { and, eq, isNull, lt, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  analyticsDailyRollups,
  analyticsScheduledReports,
  businesses,
} from "@/lib/db/schema";
import { hasFeatureAccess } from "@/lib/plans/entitlements";
import { isEmailConfigured } from "@/lib/env";
import { sendEmailWithFallback } from "@/lib/email/send-email";
import { getEmailSender } from "@/lib/email/senders";
import { renderAnalyticsScheduledReportEmail } from "@/emails/templates/analytics-scheduled-report";
import type { BusinessPlan } from "@/lib/plans/plans";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Cron job: sends scheduled analytics report emails to configured recipients.
 * Runs hourly via Vercel Cron to check for reports that are due to be sent.
 *
 * For each enabled scheduled report whose schedule period has elapsed since
 * last_sent_at (or never sent), fetches analytics metrics for the corresponding
 * period (daily=24h, weekly=7d, monthly=30d) and sends a summary email to all
 * configured recipient addresses.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendScheduledReports();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron/analytics-scheduled-reports] Failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/** Period durations in milliseconds */
const SCHEDULE_PERIODS_MS: Record<string, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

/** Period durations in days for analytics queries */
const SCHEDULE_PERIOD_DAYS: Record<string, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
};

const SCHEDULE_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

/**
 * Determines whether a report is due to be sent based on its schedule
 * and last_sent_at timestamp.
 */
function isReportDue(
  schedule: string,
  lastSentAt: Date | null,
  now: Date,
): boolean {
  const periodMs = SCHEDULE_PERIODS_MS[schedule];
  if (!periodMs) return false;

  // Never sent before — due immediately
  if (!lastSentAt) return true;

  // Due if enough time has passed since last send
  return now.getTime() - lastSentAt.getTime() >= periodMs;
}

type PeriodMetrics = {
  formViews: number;
  uniqueVisitors: number;
  inquirySubmissions: number;
  quotesSent: number;
  quotesAccepted: number;
  quotesRejected: number;
  revenueCents: number;
};

async function getPeriodMetrics(
  businessId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<PeriodMetrics> {
  const [result] = await db
    .select({
      formViews: sql<number>`coalesce(sum(${analyticsDailyRollups.formViews}), 0)`,
      uniqueVisitors: sql<number>`coalesce(sum(${analyticsDailyRollups.uniqueVisitors}), 0)`,
      inquirySubmissions: sql<number>`coalesce(sum(${analyticsDailyRollups.inquirySubmissions}), 0)`,
      quotesSent: sql<number>`coalesce(sum(${analyticsDailyRollups.quotesSent}), 0)`,
      quotesAccepted: sql<number>`coalesce(sum(${analyticsDailyRollups.quotesAccepted}), 0)`,
      quotesRejected: sql<number>`coalesce(sum(${analyticsDailyRollups.quotesRejected}), 0)`,
      revenueCents: sql<number>`coalesce(sum(${analyticsDailyRollups.revenueCents}), 0)`,
    })
    .from(analyticsDailyRollups)
    .where(
      and(
        eq(analyticsDailyRollups.businessId, businessId),
        sql`${analyticsDailyRollups.date} >= ${periodStart.toISOString().split("T")[0]}`,
        sql`${analyticsDailyRollups.date} < ${periodEnd.toISOString().split("T")[0]}`,
      ),
    );

  return {
    formViews: Number(result?.formViews ?? 0),
    uniqueVisitors: Number(result?.uniqueVisitors ?? 0),
    inquirySubmissions: Number(result?.inquirySubmissions ?? 0),
    quotesSent: Number(result?.quotesSent ?? 0),
    quotesAccepted: Number(result?.quotesAccepted ?? 0),
    quotesRejected: Number(result?.quotesRejected ?? 0),
    revenueCents: Number(result?.revenueCents ?? 0),
  };
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function sendScheduledReports() {
  if (!isEmailConfigured) {
    return { skipped: true, reason: "email_not_configured" };
  }

  const now = new Date();

  // Find all enabled scheduled reports with their business info
  const reports = await db
    .select({
      report: analyticsScheduledReports,
      business: {
        id: businesses.id,
        name: businesses.name,
        slug: businesses.slug,
        plan: businesses.plan,
      },
    })
    .from(analyticsScheduledReports)
    .innerJoin(businesses, eq(analyticsScheduledReports.businessId, businesses.id))
    .where(
      and(
        eq(analyticsScheduledReports.enabled, true),
        isNull(businesses.deletedAt),
      ),
    );

  // Filter by entitlement (analyticsWorkflow)
  const entitled = reports.filter((r) =>
    hasFeatureAccess(r.business.plan as BusinessPlan, "analyticsWorkflow"),
  );

  // Filter to only reports that are due
  const dueReports = entitled.filter((r) =>
    isReportDue(r.report.schedule, r.report.lastSentAt, now),
  );

  let sent = 0;
  let failed = 0;
  const errors: Array<{ reportId: string; error: string }> = [];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.requo.io";

  for (const { report, business } of dueReports) {
    try {
      const periodDays = SCHEDULE_PERIOD_DAYS[report.schedule] ?? 7;
      const periodLabel = SCHEDULE_LABELS[report.schedule] ?? "Weekly";

      const periodEnd = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      );
      const periodStart = new Date(periodEnd);
      periodStart.setUTCDate(periodStart.getUTCDate() - periodDays);

      // Fetch analytics metrics for the period
      const metrics = await getPeriodMetrics(business.id, periodStart, periodEnd);

      // Compute derived rates
      const formConversionRate =
        metrics.formViews > 0
          ? metrics.inquirySubmissions / metrics.formViews
          : 0;
      const quoteAcceptanceRate =
        metrics.quotesSent > 0
          ? metrics.quotesAccepted / metrics.quotesSent
          : 0;

      const dashboardUrl = `${appUrl}/${business.slug}/analytics`;

      // Render email template
      const template = renderAnalyticsScheduledReportEmail({
        businessName: business.name,
        periodLabel,
        periodStart: formatDate(periodStart),
        periodEnd: formatDate(new Date(periodEnd.getTime() - 86400000)), // End is exclusive
        metrics: [
          { label: "Form views", value: metrics.formViews },
          { label: "Unique visitors", value: metrics.uniqueVisitors },
          { label: "Inquiries", value: metrics.inquirySubmissions },
          { label: "Quotes sent", value: metrics.quotesSent },
          { label: "Quotes accepted", value: metrics.quotesAccepted },
          { label: "Quotes rejected", value: metrics.quotesRejected },
          { label: "Form conversion rate", value: formConversionRate, format: "percent" },
          { label: "Quote acceptance rate", value: quoteAcceptanceRate, format: "percent" },
          { label: "Revenue", value: metrics.revenueCents, format: "currency" },
        ],
        dashboardUrl,
      });

      // Send to all recipients
      const periodKey = periodStart.toISOString().split("T")[0];

      for (const recipientEmail of report.recipientEmails) {
        await sendEmailWithFallback({
          emailType: "notification",
          to: recipientEmail,
          from: getEmailSender("notification"),
          subject: template.subject,
          html: template.html,
          text: template.text,
          idempotencyKey: `analytics-scheduled-report:${report.id}:${periodKey}:${recipientEmail}`,
          businessId: business.id,
          metadata: {
            businessId: business.id,
            reportId: report.id,
            schedule: report.schedule,
            periodStart: periodKey,
            type: "analytics_scheduled_report",
          },
          tags: {
            type: "notification",
            event: "analytics_scheduled_report",
          },
        });
      }

      // Update last_sent_at after successful send
      await db
        .update(analyticsScheduledReports)
        .set({ lastSentAt: now, updatedAt: now })
        .where(eq(analyticsScheduledReports.id, report.id));

      sent++;
    } catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : "Unknown error";
      errors.push({ reportId: report.id, error: message });
      console.error(
        `[cron/analytics-scheduled-reports] Failed for report ${report.id}:`,
        error,
      );
    }
  }

  return {
    totalEligible: entitled.length,
    totalDue: dueReports.length,
    sent,
    failed,
    ...(errors.length > 0 ? { errors } : {}),
  };
}
