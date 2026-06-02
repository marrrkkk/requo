"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AiPanelState = {
  /** Whether the AI panel is visible. */
  isOpen: boolean;
  /** Active conversation ID (null = new chat view). */
  conversationId: string | null;
};

type AiPanelActions = {
  /** Toggle panel open/closed. */
  toggle: () => void;
  /** Open the panel. Optionally with a specific conversation. */
  open: (conversationId?: string | null) => void;
  /** Close the panel. */
  close: () => void;
  /** Navigate to a specific conversation within the panel. */
  setConversation: (conversationId: string | null) => void;
};

type AiPanelContextValue = AiPanelState & AiPanelActions;

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AiPanelContext = createContext<AiPanelContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AiPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const hasHydrated = useRef(false);

  // Restore persisted open state after hydration (avoids SSR mismatch)
  useEffect(() => {
    if (hasHydrated.current) return;
    hasHydrated.current = true;
    try {
      if (localStorage.getItem("requo-ai-panel-open") === "1") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- restore persisted state after hydration
        setIsOpen(true);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Persist open state to localStorage
  useEffect(() => {
    if (!hasHydrated.current) return;
    try {
      localStorage.setItem("requo-ai-panel-open", isOpen ? "1" : "0");
    } catch {
      // Ignore storage errors
    }
  }, [isOpen]);

  // Keyboard shortcut: Cmd+J / Ctrl+J to toggle the panel
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const open = useCallback((id?: string | null) => {
    setIsOpen(true);
    if (id !== undefined) {
      setConversationId(id);
    }
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const setConversation = useCallback((id: string | null) => {
    setConversationId(id);
  }, []);

  const value = useMemo<AiPanelContextValue>(
    () => ({
      isOpen,
      conversationId,
      toggle,
      open,
      close,
      setConversation,
    }),
    [isOpen, conversationId, toggle, open, close, setConversation],
  );

  return (
    <AiPanelContext.Provider value={value}>{children}</AiPanelContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAiPanel() {
  const context = useContext(AiPanelContext);
  if (!context) {
    throw new Error("useAiPanel must be used within AiPanelProvider");
  }
  return context;
}

/**
 * Safe version that returns null when outside provider.
 * Used by components that may render in both provider and non-provider contexts.
 */
export function useAiPanelSafe() {
  return useContext(AiPanelContext);
}
