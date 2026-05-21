import type { QuoteRevisionRequest } from "@/features/quotes/types";

type RevisionRequestFeedbackProps = {
  requests: QuoteRevisionRequest[];
};

export function RevisionRequestFeedback({
  requests,
}: RevisionRequestFeedbackProps) {
  if (!requests.length) {
    return null;
  }

  // Show only the most recent request (pending takes priority)
  const latestRequest =
    requests.find((r) => r.status === "pending") ?? requests[0];

  if (!latestRequest.message) {
    return (
      <p className="text-sm text-muted-foreground">
        The customer requested a revision but did not leave specific feedback.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200/60 bg-amber-50/50 px-4 py-3 dark:border-amber-900/30 dark:bg-amber-950/20">
      <p className="text-xs font-medium uppercase tracking-[0.1em] text-amber-700 dark:text-amber-400">
        Customer message
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {latestRequest.message}
      </p>
    </div>
  );
}
