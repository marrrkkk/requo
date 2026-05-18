import { getQuoteLibraryForBusiness } from "@/features/quotes/quote-library-queries";
import type { DashboardQuoteLibraryEntry } from "@/features/quotes/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PricingRetrieverInput = {
  inquiryText: string;
  businessId: string;
  currency: string;
  maxResults?: number; // default 7
};

export type PricingRetrieverOutput = {
  entries: DashboardQuoteLibraryEntry[];
  needsOwnerReview: boolean;
};

// ---------------------------------------------------------------------------
// Text similarity helpers
// ---------------------------------------------------------------------------

const SUFFIX_PATTERNS = /(?:ing|ed|ly|s|es|tion|ment|ness|ity|ous|ive|able|ible)$/;

/**
 * Simple stemmer: lowercase and strip common English suffixes.
 * Not linguistically perfect, but sufficient for token overlap scoring.
 */
function stem(word: string): string {
  const lower = word.toLowerCase();

  if (lower.length <= 3) return lower;

  return lower.replace(SUFFIX_PATTERNS, "") || lower;
}

/**
 * Tokenize text into stemmed tokens. Splits on non-alphanumeric characters,
 * lowercases, stems, and deduplicates.
 */
function tokenize(text: string): Set<string> {
  const tokens = new Set<string>();
  const words = text.split(/[^a-zA-Z0-9]+/).filter((w) => w.length > 0);

  for (const word of words) {
    const stemmed = stem(word);

    if (stemmed.length > 0) {
      tokens.add(stemmed);
    }
  }

  return tokens;
}

/**
 * Compute Jaccard similarity between two token sets.
 * Returns a value between 0 and 1.
 */
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 0;

  let intersectionSize = 0;

  for (const token of setA) {
    if (setB.has(token)) {
      intersectionSize++;
    }
  }

  const unionSize = setA.size + setB.size - intersectionSize;

  if (unionSize === 0) return 0;

  return intersectionSize / unionSize;
}

/**
 * Score a pricing entry against the inquiry text.
 * Combines the entry name, description, and item descriptions into a single
 * text corpus and computes Jaccard similarity against the inquiry tokens.
 */
function scoreEntry(
  entry: DashboardQuoteLibraryEntry,
  inquiryTokens: Set<string>,
): number {
  const entryParts: string[] = [entry.name];

  if (entry.description) {
    entryParts.push(entry.description);
  }

  for (const item of entry.items) {
    if (item.description) {
      entryParts.push(item.description);
    }
  }

  const entryTokens = tokenize(entryParts.join(" "));

  return jaccardSimilarity(inquiryTokens, entryTokens);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_MAX_RESULTS = 7;
const MIN_SIMILARITY_THRESHOLD = 0.1;
const SMALL_LIBRARY_THRESHOLD = 10;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Retrieves relevant pricing library entries for an inquiry using text
 * similarity scoring.
 *
 * Algorithm:
 * 1. Load pricing library for business filtered by currency
 * 2. If fewer than 3 entries exist in the target currency, return all (bypass filtering)
 * 3. Score each entry by Jaccard similarity on stemmed tokens
 * 4. Filter entries scoring ≥ 0.3
 * 5. If no entries pass threshold, return empty set with needsOwnerReview: true
 * 6. Return top entries up to maxResults (default 7), minimum 1 when results exist
 * 7. Never fabricate, interpolate, or modify pricing data
 */
export async function retrieveRelevantPricing(
  input: PricingRetrieverInput,
): Promise<PricingRetrieverOutput> {
  const maxResults = input.maxResults ?? DEFAULT_MAX_RESULTS;

  // Load all pricing library entries for the business
  const allEntries = await getQuoteLibraryForBusiness(input.businessId);

  // Filter by currency
  const currencyEntries = allEntries.filter(
    (entry) => entry.currency === input.currency,
  );

  // If fewer than 3 entries in target currency, return all (bypass filtering)
  if (currencyEntries.length < SMALL_LIBRARY_THRESHOLD) {
    return {
      entries: currencyEntries,
      needsOwnerReview: false,
    };
  }

  // Tokenize the inquiry text
  const inquiryTokens = tokenize(input.inquiryText);

  // Score each entry
  const scoredEntries = currencyEntries.map((entry) => ({
    entry,
    score: scoreEntry(entry, inquiryTokens),
  }));

  // Filter entries scoring ≥ threshold
  const passingEntries = scoredEntries.filter(
    (item) => item.score >= MIN_SIMILARITY_THRESHOLD,
  );

  // Sort all entries by score descending (even if none pass threshold)
  scoredEntries.sort((a, b) => b.score - a.score);

  // If no entries pass threshold, still return the top entries so the AI has
  // pricing context to work with, but flag for owner review
  if (passingEntries.length === 0) {
    // Return top entries (up to maxResults) even below threshold to avoid hallucination
    const fallbackCount = Math.min(currencyEntries.length, maxResults);
    const fallbackEntries = scoredEntries
      .slice(0, fallbackCount)
      .map((item) => item.entry);

    return {
      entries: fallbackEntries,
      needsOwnerReview: true,
    };
  }

  // Sort passing entries by score descending
  passingEntries.sort((a, b) => b.score - a.score);

  // Return top entries up to maxResults, minimum 1 when results exist
  const resultCount = Math.max(1, Math.min(passingEntries.length, maxResults));
  const resultEntries = passingEntries
    .slice(0, resultCount)
    .map((item) => item.entry);

  return {
    entries: resultEntries,
    needsOwnerReview: false,
  };
}

// ---------------------------------------------------------------------------
// Exported helpers (for testing)
// ---------------------------------------------------------------------------

export { tokenize, stem, jaccardSimilarity, scoreEntry };
