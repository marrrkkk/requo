import { z } from "zod";

import { getBusinessRequestContextForSlug } from "@/lib/db/business-access";
import { hasFeatureAccess } from "@/lib/plans";
import { getFreeAnalytics } from "@/features/analytics/queries";

const routeParamsSchema = z.object({
  slug: z.string().trim().min(1).max(120),
});

const exportBodySchema = z.object({
  format: z.enum(["csv", "pdf"]),
  since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// TODO: Rate limit: 5 exports per hour per business

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const parsedParams = routeParamsSchema.safeParse(await context.params);

  if (!parsedParams.success) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const requestContext = await getBusinessRequestContextForSlug(
    parsedParams.data.slug,
  );

  if (!requestContext) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  if (
    !hasFeatureAccess(
      requestContext.businessContext.business.plan,
      "exports",
    )
  ) {
    return Response.json(
      { error: "Upgrade to Pro to export analytics data." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsedBody = exportBodySchema.safeParse(body);

  if (!parsedBody.success) {
    return Response.json(
      { error: "Invalid input.", details: parsedBody.error.flatten() },
      { status: 400 },
    );
  }

  const { format, since, until } = parsedBody.data;
  const sinceDate = new Date(`${since}T00:00:00.000Z`);
  const untilDate = new Date(`${until}T23:59:59.999Z`);

  if (sinceDate >= untilDate) {
    return Response.json(
      { error: "Start date must be before end date." },
      { status: 400 },
    );
  }

  const businessId = requestContext.businessContext.business.id;
  const businessName = requestContext.businessContext.business.name;

  // Fetch analytics data for the date range
  const analytics = await getFreeAnalytics(businessId, sinceDate, untilDate);

  const generatedAt = new Date().toISOString();

  if (format === "csv") {
    const csv = generateCsv({
      businessName,
      since,
      until,
      generatedAt,
      metrics: analytics,
    });

    const filename = `analytics-${parsedParams.data.slug}-${since}-to-${until}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  // PDF: generate a simple text-based report
  const pdf = generateTextPdf({
    businessName,
    since,
    until,
    generatedAt,
    metrics: analytics,
  });

  const filename = `analytics-${parsedParams.data.slug}-${since}-to-${until}.txt`;

  // NOTE: For a full PDF implementation, integrate a library like @react-pdf/renderer or pdfkit.
  // For MVP, we return a formatted plain-text report.
  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

// ---------------------------------------------------------------------------
// CSV generation
// ---------------------------------------------------------------------------

type ExportData = {
  businessName: string;
  since: string;
  until: string;
  generatedAt: string;
  metrics: {
    formViews: number;
    uniqueVisitors: number;
    inquirySubmissions: number;
    inquiriesWithQuote: number;
    quotesSent: number;
    quotesViewed: number;
    quotesAccepted: number;
    quotesRejected: number;
    formConversionRate: number;
    inquiryToQuoteRate: number;
    quoteAcceptanceRate: number;
  };
};

function escapeCsvValue(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function generateCsv(data: ExportData): string {
  const lines: string[] = [];

  // Header metadata
  lines.push(`# Analytics Export`);
  lines.push(`# Business: ${escapeCsvValue(data.businessName)}`);
  lines.push(`# Date Range: ${data.since} to ${data.until}`);
  lines.push(`# Generated: ${data.generatedAt}`);
  lines.push(``);

  // Column headers
  lines.push(`Metric,Value`);

  // Metric rows
  const metricRows: [string, string][] = [
    ["Form Views", String(data.metrics.formViews)],
    ["Unique Visitors", String(data.metrics.uniqueVisitors)],
    ["Inquiry Submissions", String(data.metrics.inquirySubmissions)],
    ["Inquiries with Quote", String(data.metrics.inquiriesWithQuote)],
    ["Quotes Sent", String(data.metrics.quotesSent)],
    ["Quotes Viewed", String(data.metrics.quotesViewed)],
    ["Quotes Accepted", String(data.metrics.quotesAccepted)],
    ["Quotes Rejected", String(data.metrics.quotesRejected)],
    [
      "Form Conversion Rate",
      `${(data.metrics.formConversionRate * 100).toFixed(1)}%`,
    ],
    [
      "Inquiry to Quote Rate",
      `${(data.metrics.inquiryToQuoteRate * 100).toFixed(1)}%`,
    ],
    [
      "Quote Acceptance Rate",
      `${(data.metrics.quoteAcceptanceRate * 100).toFixed(1)}%`,
    ],
  ];

  for (const [metric, value] of metricRows) {
    lines.push(`${escapeCsvValue(metric)},${escapeCsvValue(value)}`);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Text-based PDF report (MVP placeholder)
// ---------------------------------------------------------------------------

function generateTextPdf(data: ExportData): string {
  const divider = "=".repeat(60);
  const lines: string[] = [];

  lines.push(divider);
  lines.push(`  ANALYTICS REPORT`);
  lines.push(divider);
  lines.push(``);
  lines.push(`  Business:    ${data.businessName}`);
  lines.push(`  Date Range:  ${data.since} to ${data.until}`);
  lines.push(`  Generated:   ${data.generatedAt}`);
  lines.push(``);
  lines.push(divider);
  lines.push(`  METRICS SUMMARY`);
  lines.push(divider);
  lines.push(``);

  const metrics: [string, string][] = [
    ["Form Views", String(data.metrics.formViews)],
    ["Unique Visitors", String(data.metrics.uniqueVisitors)],
    ["Inquiry Submissions", String(data.metrics.inquirySubmissions)],
    ["Inquiries with Quote", String(data.metrics.inquiriesWithQuote)],
    ["Quotes Sent", String(data.metrics.quotesSent)],
    ["Quotes Viewed", String(data.metrics.quotesViewed)],
    ["Quotes Accepted", String(data.metrics.quotesAccepted)],
    ["Quotes Rejected", String(data.metrics.quotesRejected)],
    [
      "Form Conversion Rate",
      `${(data.metrics.formConversionRate * 100).toFixed(1)}%`,
    ],
    [
      "Inquiry to Quote Rate",
      `${(data.metrics.inquiryToQuoteRate * 100).toFixed(1)}%`,
    ],
    [
      "Quote Acceptance Rate",
      `${(data.metrics.quoteAcceptanceRate * 100).toFixed(1)}%`,
    ],
  ];

  for (const [label, value] of metrics) {
    lines.push(`  ${label.padEnd(24)} ${value}`);
  }

  lines.push(``);
  lines.push(divider);
  lines.push(``);
  lines.push(
    `  NOTE: For full PDF with charts and visual cards, integrate a PDF`,
  );
  lines.push(`  rendering library (e.g., @react-pdf/renderer or pdfkit).`);
  lines.push(``);
  lines.push(divider);

  return lines.join("\n");
}
