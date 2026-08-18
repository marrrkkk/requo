/**
 * Milestone celebration keys.
 * Used to track which milestones have been celebrated in localStorage
 * so we only show each celebration once.
 */

const MILESTONE_PREFIX = "requo:milestone:";

export type MilestoneKey =
  | "first-inquiry"
  | "first-quote-sent"
  | "first-quote-accepted";

export const milestoneMessages: Record<
  MilestoneKey,
  { title: string; description: string }
> = {
  "first-inquiry": {
    title: "🎉 Your first inquiry just came in!",
    description: "Head to Inquiries to review it and create a quote.",
  },
  "first-quote-sent": {
    title: "📨 First quote sent!",
    description: "You'll get notified when your customer views it.",
  },
  "first-quote-accepted": {
    title: "🎊 Quote accepted!",
    description: "Well done! The workflow is working for you.",
  },
};

/**
 * Check if a milestone has already been celebrated.
 * Call this client-side before showing a toast.
 */
export function isMilestoneCelebrated(key: MilestoneKey): boolean {
  try {
    return Boolean(localStorage.getItem(`${MILESTONE_PREFIX}${key}`));
  } catch {
    return false;
  }
}

/**
 * Mark a milestone as celebrated so it won't show again.
 */
export function markMilestoneCelebrated(key: MilestoneKey): void {
  try {
    localStorage.setItem(
      `${MILESTONE_PREFIX}${key}`,
      new Date().toISOString(),
    );
  } catch {
    // localStorage unavailable
  }
}

/**
 * Check and celebrate a milestone if it hasn't been celebrated yet.
 * Returns the milestone message if it should be celebrated, null otherwise.
 */
export function checkMilestone(
  key: MilestoneKey,
): { title: string; description: string } | null {
  if (isMilestoneCelebrated(key)) {
    return null;
  }

  markMilestoneCelebrated(key);
  return milestoneMessages[key];
}
