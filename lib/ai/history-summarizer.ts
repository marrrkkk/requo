import "server-only";

import type { AiChatMessage } from "./types";

// ---------------------------------------------------------------------------
// History Summarizer — compresses older chat messages into a short recap
//
// Instead of dropping middle messages entirely when the history exceeds the
// token budget, this module generates a compact text summary of the dropped
// portion. This preserves conversational context while drastically reducing
// input tokens on long conversations.
//
// Strategy:
// - Extract topic keywords, entities, and key facts from dropped messages
// - Format as a single ~80-120 word system message
// - No AI call needed — this is a fast heuristic extraction
// ---------------------------------------------------------------------------

/**
 * Generates a compact summary of dropped conversation messages.
 * Uses heuristic extraction (no AI call) to keep it fast and free.
 *
 * Returns a system message that can be injected between the topic anchor
 * and the recent messages.
 */
export function summarizeDroppedMessages(
  droppedMessages: AiChatMessage[],
): string {
  if (droppedMessages.length === 0) return "";

  const userMessages = droppedMessages.filter((m) => m.role === "user");
  const assistantMessages = droppedMessages.filter((m) => m.role === "assistant");

  // Extract key topics from user messages
  const topics = extractTopics(userMessages.map((m) => m.content));

  // Extract any entity references (quote numbers, inquiry IDs, names)
  const entities = extractEntities(
    droppedMessages.map((m) => m.content).join(" "),
  );

  // Extract key conclusions from assistant messages (first sentence of each)
  const conclusions = assistantMessages
    .slice(-3) // Last 3 assistant messages are most relevant
    .map((m) => getFirstSentence(m.content))
    .filter(Boolean)
    .slice(0, 3);

  const parts: string[] = [
    `[${droppedMessages.length} earlier messages omitted]`,
  ];

  if (topics.length > 0) {
    parts.push(`Topics discussed: ${topics.join(", ")}.`);
  }

  if (entities.length > 0) {
    parts.push(`Referenced: ${entities.join(", ")}.`);
  }

  if (conclusions.length > 0) {
    parts.push(`Key points: ${conclusions.join(" ")}`);
  }

  return parts.join(" ");
}

/**
 * Extracts topic phrases from user messages using keyword frequency.
 * Returns top 4 most distinctive phrases.
 */
function extractTopics(texts: string[]): string[] {
  const combined = texts.join(" ");
  const words = combined
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4)
    .map((w) => w.toLowerCase());

  // Count word frequency
  const freq = new Map<string, number>();
  for (const word of words) {
    if (STOP_WORDS.has(word)) continue;
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }

  // Sort by frequency, take top terms
  const sorted = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([word]) => word);

  return sorted;
}

/**
 * Extracts entity references: quote numbers (Q-XXXX), names, emails, IDs.
 */
function extractEntities(text: string): string[] {
  const entities = new Set<string>();

  // Quote numbers
  const quoteMatches = text.match(/Q-\d{3,}/g);
  if (quoteMatches) {
    for (const m of quoteMatches.slice(0, 3)) entities.add(m);
  }

  // Inquiry/quote IDs
  const idMatches = text.match(/(?:inq|quo|aim)_[a-f0-9]{8,}/g);
  if (idMatches) {
    for (const m of idMatches.slice(0, 2)) entities.add(m.slice(0, 20));
  }

  // Capitalized names (simple heuristic: 2+ capitalized words together)
  const nameMatches = text.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)+\b/g);
  if (nameMatches) {
    for (const m of nameMatches.slice(0, 3)) entities.add(m);
  }

  // Dollar amounts
  const moneyMatches = text.match(/\$[\d,]+(?:\.\d{2})?/g);
  if (moneyMatches) {
    for (const m of moneyMatches.slice(0, 2)) entities.add(m);
  }

  return [...entities].slice(0, 5);
}

/**
 * Gets the first sentence from a text block (up to 80 chars).
 */
function getFirstSentence(text: string): string {
  // Strip markdown formatting
  const clean = text
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*|__/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n+/g, " ")
    .trim();

  const match = clean.match(/^(.+?[.!?])\s/);
  const sentence = match ? match[1] : clean.slice(0, 80);
  return sentence.length > 80 ? `${sentence.slice(0, 77)}...` : sentence;
}

const STOP_WORDS = new Set([
  "this", "that", "with", "from", "have", "been", "were", "they",
  "their", "about", "would", "could", "should", "there", "which",
  "what", "when", "where", "will", "your", "more", "some", "into",
  "than", "then", "them", "each", "make", "like", "just", "also",
  "know", "take", "come", "does", "here", "only", "very", "after",
  "before", "other", "most", "much", "well", "back", "even", "want",
  "give", "many", "good", "think", "help", "need", "please", "thank",
  "thanks", "sure", "okay", "right",
]);
