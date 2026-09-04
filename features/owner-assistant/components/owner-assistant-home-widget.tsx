"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createAssistantSessionAction } from "@/features/owner-assistant/actions";

type OwnerAssistantHomeWidgetProps = {
  businessSlug: string;
};

export function OwnerAssistantHomeWidget({
  businessSlug,
}: OwnerAssistantHomeWidgetProps) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (prompt?: string) => {
    const promptText = (prompt || input).trim();
    if (!promptText || pending) return;
    setPending(true);
    setError(null);

    // Create the session on the server, then go straight to its URL with the
    // first message attached — the reply starts streaming on arrival.
    const result = await createAssistantSessionAction({ businessSlug });

    if ("error" in result) {
      setError(result.error);
      setPending(false);
      return;
    }

    router.push(
      `/${businessSlug}/assistant/chat/${result.sessionId}?q=${encodeURIComponent(promptText)}`,
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm p-6 shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Assistant
            </h3>
            <p className="text-xs text-muted-foreground">
              Create quotes, search inquiries, or get analytics insights
            </p>
          </div>
        </div>

        {/* Input */}
        <div className="space-y-3">
          <div className="relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your business..."
              className="min-h-[80px] resize-none pr-12"
              disabled={pending}
            />
            <Button
              onClick={() => void handleSubmit()}
              disabled={!input.trim() || pending}
              size="icon"
              className="absolute bottom-2 right-2"
              aria-label="Ask the assistant"
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}

          {/* Example prompts */}
          <div className="flex flex-wrap gap-2">
            {[
              "Show this week's inquiries",
              "What's my conversion rate?",
              "Find quotes over $5000",
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => void handleSubmit(prompt)}
                disabled={pending}
                className="text-xs px-3 py-1.5 rounded-full border border-border/60 bg-muted/40 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
