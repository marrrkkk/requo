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
    title: "Follow-ups keep deals moving",
    description:
      "Schedule reminders for quotes that go quiet or inquiries that need a reply. Requo can also create follow-ups automatically when quotes go quiet.",
  },
} as const satisfies Record<string, FeatureTipConfig>;
