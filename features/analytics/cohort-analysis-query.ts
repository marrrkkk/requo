import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";

import type { CohortRow } from "@/features/analytics/types";
import { db } from "@/lib/db/client";
import { inquiries } from "@/lib/db/schema";

/**
 * Computes cohort analysis data: groups customers (by email) by the month
 * of their first inquiry, then tracks what percentage submitted a new inquiry
 * within 3, 6, and 12 months of their first.
 *
 * Returns an empty array if fewer than 3 months of historical data exist.
 *
 * Customers are identified by their `customerEmail` field. Inquiries without
 * an email are excluded from cohort analysis.
 */
export async function getCohortAnalysis(
  businessId: string,
): Promise<CohortRow[]> {
  // First, check if we have at least 3 months of data
  const [earliestRow] = await db
    .select({
      earliest: sql<string | null>`min(to_char(${inquiries.submittedAt}, 'YYYY-MM'))`,
      latest: sql<string | null>`max(to_char(${inquiries.submittedAt}, 'YYYY-MM'))`,
    })
    .from(inquiries)
    .where(
      and(
        eq(inquiries.businessId, businessId),
        isNull(inquiries.deletedAt),
        sql`${inquiries.customerEmail} is not null and ${inquiries.customerEmail} != ''`,
      ),
    );

  if (!earliestRow?.earliest || !earliestRow?.latest) {
    return [];
  }

  // Check month difference
  const earliest = new Date(earliestRow.earliest + "-01");
  const latest = new Date(earliestRow.latest + "-01");
  const monthDiff =
    (latest.getFullYear() - earliest.getFullYear()) * 12 +
    (latest.getMonth() - earliest.getMonth());

  if (monthDiff < 3) {
    return [];
  }

  // Query cohort data using a CTE approach:
  // 1. Find each customer's first inquiry month
  // 2. For each cohort month, count total customers
  // 3. Count how many submitted another inquiry within 3, 6, 12 months
  const rows = await db.execute<{
    cohort_month: string;
    total_customers: string;
    returned_in_3_months: string;
    returned_in_6_months: string;
    returned_in_12_months: string;
  }>(sql`
    WITH customer_first_inquiry AS (
      SELECT
        lower(${inquiries.customerEmail}) AS email,
        min(${inquiries.submittedAt}) AS first_inquiry_at,
        to_char(min(${inquiries.submittedAt}), 'YYYY-MM') AS cohort_month
      FROM ${inquiries}
      WHERE ${inquiries.businessId} = ${businessId}
        AND ${inquiries.deletedAt} IS NULL
        AND ${inquiries.customerEmail} IS NOT NULL
        AND ${inquiries.customerEmail} != ''
      GROUP BY lower(${inquiries.customerEmail})
    ),
    customer_returns AS (
      SELECT
        cfi.email,
        cfi.cohort_month,
        cfi.first_inquiry_at,
        CASE WHEN EXISTS (
          SELECT 1 FROM ${inquiries} i2
          WHERE lower(i2.customer_email) = cfi.email
            AND i2.business_id = ${businessId}
            AND i2.deleted_at IS NULL
            AND i2.submitted_at > cfi.first_inquiry_at
            AND i2.submitted_at <= cfi.first_inquiry_at + interval '3 months'
        ) THEN 1 ELSE 0 END AS returned_3m,
        CASE WHEN EXISTS (
          SELECT 1 FROM ${inquiries} i2
          WHERE lower(i2.customer_email) = cfi.email
            AND i2.business_id = ${businessId}
            AND i2.deleted_at IS NULL
            AND i2.submitted_at > cfi.first_inquiry_at
            AND i2.submitted_at <= cfi.first_inquiry_at + interval '6 months'
        ) THEN 1 ELSE 0 END AS returned_6m,
        CASE WHEN EXISTS (
          SELECT 1 FROM ${inquiries} i2
          WHERE lower(i2.customer_email) = cfi.email
            AND i2.business_id = ${businessId}
            AND i2.deleted_at IS NULL
            AND i2.submitted_at > cfi.first_inquiry_at
            AND i2.submitted_at <= cfi.first_inquiry_at + interval '12 months'
        ) THEN 1 ELSE 0 END AS returned_12m
      FROM customer_first_inquiry cfi
    )
    SELECT
      cohort_month,
      count(*)::text AS total_customers,
      sum(returned_3m)::text AS returned_in_3_months,
      sum(returned_6m)::text AS returned_in_6_months,
      sum(returned_12m)::text AS returned_in_12_months
    FROM customer_returns
    GROUP BY cohort_month
    ORDER BY cohort_month ASC
  `);

  return rows.map((row) => ({
    cohortMonth: row.cohort_month,
    totalCustomers: Number(row.total_customers),
    returnedIn3Months: Number(row.returned_in_3_months),
    returnedIn6Months: Number(row.returned_in_6_months),
    returnedIn12Months: Number(row.returned_in_12_months),
  }));
}
