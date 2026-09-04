"use client";

import { useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Type your message…",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    // Auto-grow textarea
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="border-t bg-background px-4 py-3">
      <div className="relative flex items-end gap-2 rounded-xl border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring transition-shadow">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="min-h-0 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 text-sm leading-6 flex-1"
          aria-label="Message"
        />
        <Button
          type="button"
          size="icon-sm"
          variant={canSend ? "default" : "ghost"}
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className="mb-0.5 shrink-0"
        >
          <ArrowUp className="size-3.5" />
        </Button>
      </div>
      <p className="mt-1.5 text-center text-[0.68rem] text-muted-foreground">
        Press Enter to send · Shift+Enter for a new line
      </p>
    </div>
  );
}
