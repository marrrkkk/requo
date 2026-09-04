"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Sparkles } from "lucide-react";
import { createAssistantSessionAction } from "@/features/owner-assistant/actions";

/**
 * New-chat composer for the Assistant section root.
 * Creates nothing until a message is sent — the server mints the session,
 * then the client navigates to its URL.
 */
export function AssistantComposer({ businessSlug }: { businessSlug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoSentRef = useRef(false);

  const submit = async (promptText: string) => {
    const text = promptText.trim();
    if (!text || pending) return;
    setPending(true);
    setError(null);

    const result = await createAssistantSessionAction({
      businessSlug,
    });

    if ("error" in result) {
      setError(result.error);
      setPending(false);
      return;
    }

    router.push(
      `/${businessSlug}/assistant/chat/${result.sessionId}?q=${encodeURIComponent(text)}`,
    );
  };

  // Arriving with ?q= (e.g. from the dashboard home box) sends immediately.
  useEffect(() => {
    const queued = searchParams.get("q");
    if (queued && !autoSentRef.current) {
      autoSentRef.current = true;
      void submit(queued);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className="w-full max-w-2xl">
        <div className="flex flex-col items-center text-center space-y-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Assistant</h2>
          <p className="text-sm text-muted-foreground">
            Ask about your inquiries, quotes, or business performance
          </p>
        </div>

        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit(input);
              }
            }}
            placeholder="Ask about inquiries, quotes, or create records..."
            className="min-h-[96px] resize-none pr-12"
            disabled={pending}
            aria-label="Start a new conversation"
          />
          <Button
            onClick={() => void submit(input)}
            disabled={!input.trim() || pending}
            size="icon"
            className="absolute bottom-3 right-3"
            aria-label="Send message"
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        {error && (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          {[
            "Show this week's inquiries",
            "What's my conversion rate?",
            "Find quotes over $5000",
            "New inquiries this month",
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => void submit(prompt)}
              disabled={pending}
              className="text-xs px-3 py-1.5 rounded-full border border-border/60 bg-muted/40 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
