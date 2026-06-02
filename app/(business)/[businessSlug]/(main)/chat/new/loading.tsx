/**
 * Empty loading boundary so the parent chat/loading.tsx doesn't double-flash
 * when navigating to chat/new. Returns null to keep the previous page visible
 * until the new one is ready.
 */
export default function ChatNewLoading() {
  return null;
}
