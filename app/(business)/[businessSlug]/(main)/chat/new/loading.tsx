import { Sparkles } from "lucide-react";

export default function ChatNewLoading() {
  return (
    <div className="chat-page-container">
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="size-5 text-primary animate-pulse" />
        </div>
        <p className="text-sm text-muted-foreground">Preparing chat…</p>
      </div>
    </div>
  );
}
