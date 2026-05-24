/**
 * Empty loading boundary so the generic DashboardPageSkeleton doesn't flash
 * when navigating to a chat conversation (e.g. from the dashboard input).
 * Returns null to keep the previous page visible until the new one is ready.
 */
export default function ChatConversationLoading() {
  return null;
}
