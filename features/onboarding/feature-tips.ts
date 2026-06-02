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
  automations: {
    tipKey: "automations-overview",
    title: "Automate your follow-up workflow",
    description:
      "Set rules like 'when a quote is viewed, create a follow-up in 3 days' so you never forget to check in. Start with a template or build your own.",
  },
  analytics: {
    tipKey: "analytics-overview",
    title: "Track your inquiry-to-revenue pipeline",
    description:
      "See how inquiries convert to quotes, which quotes get accepted, and where leads drop off. Use this to improve your response time and win rate.",
  },
  jobs: {
    tipKey: "jobs-overview",
    title: "Jobs track delivery after a quote is accepted",
    description:
      "Create a job from an accepted quote to track progress from start to finish. When work is done, generate an invoice directly from the job.",
  },
  invoices: {
    tipKey: "invoices-overview",
    title: "Invoice completed work and track payment",
    description:
      "Generate invoices from jobs or quotes, send them to customers, and track sent and paid status. The last step in your workflow.",
  },
  followUps: {
    tipKey: "follow-ups-overview",
    title: "Follow-ups keep deals moving",
    description:
      "Schedule reminders for quotes that go quiet or inquiries that need a reply. Requo can also create follow-ups automatically through automations.",
  },
} as const satisfies Record<string, FeatureTipConfig>;
