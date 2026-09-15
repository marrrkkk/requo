import { describe, expect, it } from "vitest";

import {
  COMMON_STOPWORDS,
  lexicalMatchScore,
  matchedTerms,
  significantTerms,
  tokenize,
} from "@/lib/ai/text-terms";

/**
 * Pins the lexical scoring scale used by knowledge/memory retrieval.
 *
 * Two changes here alter which candidates clear the retrieval thresholds
 * (`COMBINED_SCORE_THRESHOLD = 0.26`, `COSINE_FLOOR = 0.16`):
 *
 * 1. Stopwords are dropped, so "what", "does" and "your" stop scoring as if
 *    they were meaningful query terms.
 * 2. Matching is whole-token, so "cat" no longer matches "category".
 *
 * Both tighten the lexical component, which is why the score scale is pinned
 * here rather than left implicit.
 */

describe("significantTerms", () => {
  it("drops function words from a natural-language query", () => {
    expect(significantTerms("what does your refund policy say")).toEqual([
      "refund",
      "policy",
    ]);
  });

  it("keeps domain vocabulary that is meaningful in this product", () => {
    expect(significantTerms("quote pricing service offer")).toEqual([
      "quote",
      "pricing",
      "service",
      "offer",
    ]);
  });

  it("never treats domain words as stopwords", () => {
    for (const word of [
      "service",
      "services",
      "quote",
      "quotes",
      "price",
      "pricing",
      "cost",
      "offer",
      "estimate",
    ]) {
      expect(COMMON_STOPWORDS.has(word)).toBe(false);
    }
  });

  it("drops terms shorter than four characters", () => {
    expect(significantTerms("get a van now")).toEqual([]);
  });

  it("dedupes repeated terms", () => {
    expect(significantTerms("policy policy policy")).toEqual(["policy"]);
  });

  it("returns an empty list for a stopword-only query", () => {
    expect(significantTerms("what does this that")).toEqual([]);
  });

  it("treats a supplied stopword set as a replacement, not an extension", () => {
    // Pricing passes its own set and relies on the shared function words not
    // leaking in — otherwise its term selection would shift silently.
    expect(significantTerms("what does your refund policy say", new Set(["the"]))).toEqual([
      "what",
      "does",
      "your",
      "refund",
      "policy",
    ]);
  });
});

describe("tokenize", () => {
  it("splits on non-alphanumeric characters", () => {
    expect([...tokenize("Net-30, 50% upfront")].sort()).toEqual([
      "30",
      "50",
      "net",
      "upfront",
    ]);
  });
});

describe("matchedTerms", () => {
  it("matches whole tokens only", () => {
    expect(matchedTerms("our refund policy", ["refund", "policy"])).toEqual([
      "refund",
      "policy",
    ]);
  });

  it("does not match a term embedded in a longer word", () => {
    // The regression: substring matching scored these as hits.
    expect(matchedTerms("category listing", ["cat"])).toEqual([]);
    expect(matchedTerms("concatenate the strings", ["cat"])).toEqual([]);
  });

  it("returns an empty list when there are no terms", () => {
    expect(matchedTerms("anything at all", [])).toEqual([]);
  });
});

describe("lexicalMatchScore", () => {
  it("returns the fraction of terms present", () => {
    expect(
      lexicalMatchScore("refund policy for damaged goods", [
        "refund",
        "policy",
        "shipping",
      ]),
    ).toBeCloseTo(2 / 3);
  });

  it("returns 1 when every term is present", () => {
    expect(lexicalMatchScore("refund policy", ["refund", "policy"])).toBe(1);
  });

  it("returns 0 when no term is present", () => {
    expect(lexicalMatchScore("unrelated content", ["refund"])).toBe(0);
  });

  it("returns 0 for an empty term list rather than dividing by zero", () => {
    expect(lexicalMatchScore("anything", [])).toBe(0);
  });

  it("does not credit substring matches", () => {
    expect(lexicalMatchScore("category", ["cat"])).toBe(0);
  });
});

/**
 * The previous implementation, kept here so the change can be measured rather
 * than assumed. Retrieval's thresholds (`COMBINED_SCORE_THRESHOLD = 0.26`,
 * `COSINE_FLOOR = 0.16`) were tuned against these scores, so the question that
 * matters is whether legitimate matches still score at least as well.
 */
function legacySignificantTerms(query: string): string[] {
  return Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((term) => term.length >= 4),
    ),
  );
}

function legacyLexicalScore(content: string, terms: string[]): number {
  if (terms.length === 0) {
    return 0;
  }

  const normalized = content.toLowerCase();

  return (
    terms.filter((term) => normalized.includes(term)).length / terms.length
  );
}

function score(query: string, content: string) {
  return {
    legacy: legacyLexicalScore(content, legacySignificantTerms(query)),
    current: lexicalMatchScore(content, significantTerms(query)),
  };
}

describe("legacy vs current lexical scoring", () => {
  it("does not reduce the score of genuine whole-word matches", () => {
    const { legacy, current } = score(
      "refund policy for damaged goods",
      "Our refund policy covers damaged goods within 30 days.",
    );

    expect(current).toBe(legacy);
    expect(current).toBe(1);
  });

  it("raises the score when the query was padded with function words", () => {
    // The old denominator counted "what"/"does"/"your" as terms the document
    // failed to match, depressing the score of a perfectly relevant chunk.
    const { legacy, current } = score(
      "what does your refund policy say",
      "Refund policy applies to damaged items.",
    );

    expect(legacy).toBeCloseTo(2 / 5);
    expect(current).toBe(1);
    expect(current).toBeGreaterThan(legacy);
  });

  it("eliminates substring-only false positives", () => {
    // "port" inside "important"/"export", and "deposit" inside "deposited".
    const partial = score(
      "port forwarding",
      "The important export forwarding report",
    );
    expect(partial.legacy).toBe(1);
    expect(partial.current).toBeCloseTo(0.5);

    const total = score(
      "term deposit",
      "The terms are deposited elsewhere",
    );
    expect(total.legacy).toBe(1);
    expect(total.current).toBe(0);
  });

  it("keeps a relevant chunk above the lexical-only term floor", () => {
    // `LEXICAL_ONLY_MIN_TERMS = 2` is the guard when no embedding exists.
    const terms = significantTerms("how do you handle refund policy");
    const matched = matchedTerms(
      "Refund policy applies to damaged items.",
      terms,
    );

    expect(matched.length).toBeGreaterThanOrEqual(2);
  });
});
