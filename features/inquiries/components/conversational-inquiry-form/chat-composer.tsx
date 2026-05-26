"use client";

import { useLayoutEffect, useRef, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Composer (matching dashboard AI ChatInput pattern)                         */
/* -------------------------------------------------------------------------- */

export function ChatComposer({
  disabled,
  placeholder,
  value,
  onChange,
  onSubmit,
  isGenerating,
}: {
  disabled: boolean;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isGenerating?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    const el = textareaRef.current;

    if (!el) return;

    el.style.height = "0px";
    const nextHeight = Math.min(el.scrollHeight, 140);
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = el.scrollHeight > 140 ? "auto" : "hidden";
  }, [value]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <form
      className={cn(
        "relative flex items-center rounded-2xl bg-muted/70 px-4 py-3 transition-shadow",
        isGenerating && "ai-glow-border",
      )}
      onSubmit={handleSubmit}
    >
      <textarea
        className="min-h-6 max-h-[8.75rem] flex-1 resize-none overflow-hidden border-none bg-transparent px-0 py-0 text-sm leading-6 text-foreground shadow-none outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        maxLength={2000}
        onChange={(event) => onChange(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        ref={textareaRef}
        rows={1}
        value={value}
      />

      <Button
        aria-label="Send message"
        className="ml-2 size-8 shrink-0 rounded-lg"
        disabled={disabled || !value.trim()}
        size="icon-sm"
        type="submit"
      >
        {disabled ? <Spinner aria-hidden="true" /> : <ArrowUp className="size-4" />}
      </Button>
    </form>
  );
}
