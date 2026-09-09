/**
 * Predefined contextual tips for feature pages.
 * These are shown on first visit to help users understand the page's purpose
 * and how it connects to the broader workflow.
 */

export type FeatureTipConfig = {
  tipKey: string;
  title: string;
  description: string;
};

export const featureTips = {
  quotes: {
    tipKey: "quotes-overview",
    title: "Quotes turn inquiries into revenue",
    description:
      "Create line-item quotes, share a customer link, and track when they're viewed, accepted, or expired. Follow up on quiet quotes to close more deals.",
  },
  analytics: {
    tipKey: "analytics-overview",
    title: "Track your inquiry-to-revenue pipeline",
    description:
      "See how inquiries convert to quotes, which quotes get accepted, and where leads drop off. Use this to improve your response time and win rate.",
  },
  followUps: {
    tipKey: "follow-ups-overview",
    title: "Recover quiet quotes",
    description:
      "Work overdue quotes first, review and send the next message, and record what happened. Automatic sequences appear here too and stop when the customer views or responds.",
  },
} as const satisfies Record<string, FeatureTipConfig>;
