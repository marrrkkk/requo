export const analyticsTiers = {
  free: {
    id: "free",
    label: "Overview",
    description: "Key metrics at a glance.",
  },
  pro: {
    id: "pro",
    label: "Performance",
    description: "Trends, funnels, and form-level breakdown.",
  },
  business: {
    id: "business",
    label: "Operations",
    description: "Workflow timing, alerts, revenue, and team activity.",
  },
} as const;

export type AnalyticsTierId = keyof typeof analyticsTiers;
