import { NextResponse } from "next/server";

import { and, eq, gte, lt, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  analyticsDailyRollups,
  businesses,
  businessMembers,
  user,
} from "@/lib/db/schema";
import { hasFeatureAccess } from "@/lib/plans/entitlements";
import { generateWithFallback, isAiConfigured } from "@/lib/ai";
import { isEmailConfigured } from "@/lib/env";
import { sendEmailWithFallback } from "@/lib/email/send-email";
import { getEmailSender } from "@/lib/email/senders";
import { renderAnalyticsDigestEmail } from "@/emails/templates/analytics-digest";
import type { BusinessPlan } from "@/lib/plans/plans";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Cron job: sends weekly analytics digest emails to business owners.
 * Runs every Monday at 9:00 AM UTC via Vercel Cron.
 *
 * For each eligible business (analytics_digest_enabled = true AND plan has
 * analyticsWorkflow entitlement), computes week-over-week metric deltas,
 * generates AI action recommendations, and sends a branded digest email.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendDigestEmails();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron/analytics-digest] Failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

type WeekMetrics = {
  formViews: number;
  inquirySubmissions: number;
  quotesSent: number;
  quotesAccepted: number;
};

async function getWeekMetrics(
  businessId: string,
  weekStart: Date,
  weekEnd: Date,
): Promise<WeekMetrics> {
  const [result] = await db
    .select({
      formViews: sql<number>`coalesce(sum(${analyticsDailyRollups.formViews}), 0)`,
      inquirySubmissions: sql<number>`coalesce(sum(${analyticsDailyRollups.inquirySubmissions}), 0)`,
      quotesSent: sql<number>`coalesce(sum(${analyticsDailyRollups.quotesSent}), 0)`,
      quotesAccepted: sql<number>`coalesce(sum(${analyticsDailyRollups.quotesAccepted}), 0)`,
    })
    .from(analyticsDailyRollups)
    .where(
      and(
        eq(analyticsDailyRollups.businessId, businessId),
        gte(analyticsDailyRollups.date, weekStart.toISOString().split("T")[0]),
        lt(analyticsDailyRollups.date, weekEnd.toISOString().split("T")[0]),
      ),
    );

  return {
    formViews: Number(result?.formViews ?? 0),
    inquirySubmissions: Number(result?.inquirySubmissions ?? 0),
    quotesSent: Number(result?.quotesSent ?? 0),
    quotesAccepted: Number(result?.quotesAccepted ?? 0),
  };
}

async function generateRecommendations(
  businessName: string,
  current: WeekMetrics,
  prior: WeekMetrics,
): Promise<string[]> {
  if (!isAiConfigured()) {
    return [];
  }

  const prompt = [
    "You are a business analytics advisor for a service business. Based on the week-over-week metric changes below, provide 1-3 specific, actionable recommendations. Keep each recommendation to one sentence.",
    "",
    `Business: ${businessName}`,
    "",
    "This week vs last week:",
    `- Form views: ${current.formViews} (was ${prior.formViews})`,
    `- Inquiry submissions: ${current.inquirySubmissions} (was ${prior.inquirySubmissions})`,
    `- Quotes sent: ${current.quotesSent} (was ${prior.quotesSent})`,
    `- Quotes accepted: ${current.quotesAccepted} (was ${prior.quotesAccepted})`,
    "",
    "Respond with 1-3 recommendations, one per line. No bullet points, no numbering, no labels. Just the recommendation sentences.",
  ].join("\n");

  try {
    const response = await generateWithFallback({
      model: "",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      maxOutputTokens: 300,
      qualityTier: "cheap",
    });

    const lines = response.text
      .trim()
      .split("\n")
      .map((line) => line.replace(/^[-•*\d.)\s]+/, "").trim())
      .filter((line) => line.length > 0)
      .slice(0, 3);

    return lines;
  } catch (error) {
    console.warn("[cron/analytics-digest] AI recommendation generation failed:", error);
    return [];
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function sendDigestEmails() {
  if (!isEmailConfigured) {
    return { skipped: true, reason: "email_not_configured" };
  }

  // Find eligible businesses: digest enabled + plan has analyticsWorkflow
  const eligibleBusinesses = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      plan: businesses.plan,
    })
    .from(businesses)
    .where(
      and(
        eq(businesses.analyticsDigestEnabled, true),
        sql`${businesses.deletedAt} IS NULL`,
      ),
    );

  // Filter by entitlement (analyticsWorkflow)
  const entitled = eligibleBusinesses.filter((b) =>
    hasFeatureAccess(b.plan as BusinessPlan, "analyticsWorkflow"),
  );

  // Compute date ranges: this week (Mon–Sun prior) and prior week
  const now = new Date();
  // Find last Monday (start of this past week)
  const thisWeekEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const thisWeekStart = new Date(thisWeekEnd);
  thisWeekStart.setUTCDate(thisWeekStart.getUTCDate() - 7);

  const priorWeekEnd = new Date(thisWeekStart);
  const priorWeekStart = new Date(priorWeekEnd);
  priorWeekStart.setUTCDate(priorWeekStart.getUTCDate() - 7);

  let sent = 0;
  let failed = 0;
  const errors: Array<{ businessId: string; error: string }> = [];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.requo.io";

  for (const business of entitled) {
    try {
      // Get owner email (first owner member)
      const [ownerMember] = await db
        .select({
          email: user.email,
          name: user.name,
        })
        .from(businessMembers)
        .innerJoin(user, eq(businessMembers.userId, user.id))
        .where(
          and(
            eq(businessMembers.businessId, business.id),
            eq(businessMembers.role, "owner"),
          ),
        )
        .limit(1);

      if (!ownerMember?.email) {
        continue;
      }

      // Compute metrics for both weeks
      const [currentMetrics, priorMetrics] = await Promise.all([
        getWeekMetrics(business.id, thisWeekStart, thisWeekEnd),
        getWeekMetrics(business.id, priorWeekStart, priorWeekEnd),
      ]);

      // Generate AI recommendations
      const recommendations = await generateRecommendations(
        business.name,
        currentMetrics,
        priorMetrics,
      );

      const dashboardUrl = `${appUrl}/${business.slug}/analytics`;

      // Render email
      const template = renderAnalyticsDigestEmail({
        businessName: business.name,
        weekStartDate: formatDate(thisWeekStart),
        weekEndDate: formatDate(new Date(thisWeekEnd.getTime() - 86400000)), // End is exclusive, show last day
        metrics: [
          { label: "Form views", current: currentMetrics.formViews, prior: priorMetrics.formViews },
          { label: "Inquiries", current: currentMetrics.inquirySubmissions, prior: priorMetrics.inquirySubmissions },
          { label: "Quotes sent", current: currentMetrics.quotesSent, prior: priorMetrics.quotesSent },
          { label: "Quotes accepted", current: currentMetrics.quotesAccepted, prior: priorMetrics.quotesAccepted },
        ],
        recommendations,
        dashboardUrl,
      });

      // Send email
      const weekKey = thisWeekStart.toISOString().split("T")[0];
      await sendEmailWithFallback({
        emailType: "notification",
        to: ownerMember.email,
        from: getEmailSender("notification"),
        subject: template.subject,
        html: template.html,
        text: template.text,
        idempotencyKey: `analytics-digest:${business.id}:${weekKey}`,
        businessId: business.id,
        metadata: {
          businessId: business.id,
          weekStart: weekKey,
          type: "analytics_digest",
        },
        tags: {
          type: "notification",
          event: "analytics_digest",
        },
      });

      sent++;
    } catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : "Unknown error";
      errors.push({ businessId: business.id, error: message });
      console.error(
        `[cron/analytics-digest] Failed for business ${business.id}:`,
        error,
      );
    }
  }

  return {
    totalEligible: entitled.length,
    sent,
    failed,
    ...(errors.length > 0 ? { errors } : {}),
  };
}
