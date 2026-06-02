/**
 * Structural loading state for chat routes.
 * Returns null so the previous page stays visible during navigation —
 * keeps transitions feeling instant rather than flashing a spinner.
 * Sub-routes (chat/new, chat/[id]) have their own loading.tsx if needed.
 */
export default function ChatLoading() {
  return null;
}
