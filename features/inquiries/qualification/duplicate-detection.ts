import type { RecentInquiryInput } from "./types";

/**
 * Compute the token overlap between two text strings as a percentage.
 *
 * Algorithm:
 * 1. Lowercase both texts
 * 2. Split each on whitespace into token sets (deduplicated via Set)
 * 3. Compute the intersection of the two token sets
 * 4. Divide intersection size by the size of the smaller set
 * 5. Express as a percentage (0–100)
 *
 * Edge cases: if either text is empty or produces no tokens, returns 0.
 * The result is symmetric — computeTokenOverlap(a, b) === computeTokenOverlap(b, a).
 */
export function computeTokenOverlap(textA: string, textB: string): number {
  const tokensA = new Set(textA.toLowerCase().split(/\s+/).filter(Boolean));
  const tokensB = new Set(textB.toLowerCase().split(/\s+/).filter(Boolean));

  if (tokensA.size === 0 || tokensB.size === 0) {
    return 0;
  }

  const smallerSet = tokensA.size <= tokensB.size ? tokensA : tokensB;
  const largerSet = tokensA.size <= tokensB.size ? tokensB : tokensA;

  let intersectionCount = 0;
  for (const token of smallerSet) {
    if (largerSet.has(token)) {
      intersectionCount++;
    }
  }

  return (intersectionCount / smallerSet.size) * 100;
}


/**
 * Find a duplicate inquiry based on email recency.
 *
 * Checks whether any inquiry from the same customer email was submitted
 * within the specified window (default 7 calendar days) before the new
 * inquiry's submission date.
 *
 * Returns the ID of the most recent matching inquiry, or null if no match.
 * Skips the check entirely when customerEmail is null.
 */
export function findEmailRecencyDuplicate(
  customerEmail: string | null,
  recentInquiries: RecentInquiryInput[],
  submittedAt: Date,
  windowDays: number = 7,
): string | null {
  if (customerEmail === null) {
    return null;
  }

  const emailLower = customerEmail.toLowerCase();

  // Filter to inquiries from the same email (case-insensitive)
  const sameEmailInquiries = recentInquiries.filter(
    (inquiry) => inquiry.customerEmail.toLowerCase() === emailLower,
  );

  // Filter to those within the window (submitted within windowDays calendar days before submittedAt)
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const windowStart = new Date(submittedAt.getTime() - windowMs);

  const matchingInquiries = sameEmailInquiries.filter(
    (inquiry) =>
      inquiry.submittedAt >= windowStart && inquiry.submittedAt < submittedAt,
  );

  if (matchingInquiries.length === 0) {
    return null;
  }

  // Return the most recent matching inquiry's ID
  matchingInquiries.sort(
    (a, b) => b.submittedAt.getTime() - a.submittedAt.getTime(),
  );

  return matchingInquiries[0].id;
}


/**
 * Detect text similarity duplicates by comparing the details text of a new
 * inquiry against recent inquiries from the same customer email.
 *
 * Logic:
 * 1. If customerEmail is null, return null (skip check)
 * 2. Filter recentInquiries to those from the same email within windowDays
 *    (default 30) before submittedAt
 * 3. For each matching inquiry, compute token overlap between the new details
 *    and the existing inquiry's details
 * 4. If any overlap exceeds the threshold (default 80%), flag as duplicate
 * 5. If multiple matches exceed threshold, reference the most recent one
 * 6. Return { inquiryId, overlap } or null
 */
export function findTextSimilarityDuplicate(
  details: string,
  customerEmail: string | null,
  recentInquiries: RecentInquiryInput[],
  submittedAt: Date,
  windowDays: number = 30,
  overlapThreshold: number = 0.8,
): { inquiryId: string; overlap: number } | null {
  // Skip check when email is null
  if (customerEmail === null) {
    return null;
  }

  // Compute the window start date
  const windowStart = new Date(submittedAt);
  windowStart.setDate(windowStart.getDate() - windowDays);

  // Filter to inquiries from the same email within the time window
  const emailLower = customerEmail.toLowerCase();
  const candidates = recentInquiries.filter((inquiry) => {
    const emailMatch = inquiry.customerEmail.toLowerCase() === emailLower;
    const withinWindow =
      inquiry.submittedAt >= windowStart && inquiry.submittedAt < submittedAt;
    return emailMatch && withinWindow;
  });

  // The threshold is expressed as a ratio (0.8) but computeTokenOverlap
  // returns a percentage (0–100), so convert threshold to percentage
  const thresholdPercent = overlapThreshold * 100;

  // Find all candidates that exceed the overlap threshold, keeping the most recent
  let bestMatch: { inquiryId: string; overlap: number; submittedAt: Date } | null = null;

  for (const candidate of candidates) {
    const overlap = computeTokenOverlap(details, candidate.details);

    if (overlap > thresholdPercent) {
      if (bestMatch === null || candidate.submittedAt > bestMatch.submittedAt) {
        bestMatch = { inquiryId: candidate.id, overlap, submittedAt: candidate.submittedAt };
      }
    }
  }

  if (bestMatch === null) {
    return null;
  }

  return { inquiryId: bestMatch.inquiryId, overlap: bestMatch.overlap };
}
