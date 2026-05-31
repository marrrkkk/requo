import { Sparkles } from "lucide-react";

/**
 * Structural loading state for chat routes.
 * Renders the chat page container frame with a minimal centered loading indicator.
 * Sub-routes (chat/new, chat/[id]) have their own loading.tsx for specifics.
 */
export default function ChatLoading() {
  return (
    <div className="chat-page-container">
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="size-5 text-primary animate-pulse" />
        </div>
        <p className="text-sm text-muted-foreground">Loading chat…</p>
      </div>
    </div>
  );
}
