"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { RequoIcon } from "@/components/shared/requo-icon";
import { useAiPanelSafe } from "@/features/ai/chat-ui/ai-panel-provider";
import { getBusinessChatNewPath } from "@/features/businesses/routes";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pages where the Ask Requo button should be hidden (they have their own chat UI). */
function shouldHideButton(pathname: string): boolean {
  // Hide on home page
  if (pathname.match(/^\/[^/]+\/home$/)) return true;
  // Hide on chat pages (new and conversation)
  if (pathname.match(/^\/[^/]+\/chat(\/|$)/)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type AskRequoButtonProps = {
  businessSlug: string;
  userName?: string;
  variant?: "default" | "ghost";
};

/**
 * "Ask Requo" button for the top navigation.
 *
 * When rendered inside AiPanelProvider, toggles the global AI side panel.
 * Hidden when the panel is already open, or on pages with their own chat UI.
 * When outside (e.g. legacy shell), falls back to navigating to /chat/new.
 */
export function AskRequoButton({
  businessSlug,
  variant = "default",
}: AskRequoButtonProps) {
  const panelContext = useAiPanelSafe();
  const pathname = usePathname();

  // Hide on home and chat pages
  if (shouldHideButton(pathname)) return null;

  // If inside AiPanelProvider, toggle the panel
  if (panelContext) {
    const { toggle, isOpen } = panelContext;

    // Hide button when panel is open
    if (isOpen) return null;

    return (
      <Button
        variant={variant === "ghost" ? "ghost" : undefined}
        size="sm"
        type="button"
        className="whitespace-nowrap gap-1.5"
        onClick={toggle}
        aria-label="Open AI assistant"
      >
        <RequoIcon className="size-3.5" />
        <span className="hidden sm:inline">Ask Requo</span>
      </Button>
    );
  }

  // Fallback: navigate to chat/new
  return (
    <Button
      asChild
      variant={variant === "ghost" ? "ghost" : undefined}
      size="sm"
      className="whitespace-nowrap gap-1.5"
    >
      <Link href={getBusinessChatNewPath(businessSlug)}>
        <RequoIcon className="size-3.5" />
        <span className="hidden sm:inline">Ask Requo</span>
      </Link>
    </Button>
  );
}
