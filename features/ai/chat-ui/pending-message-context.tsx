"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type PendingMessageContextType = {
  /** The current pending message value (reactive, for conditional rendering). */
  pendingMessage: string | null;
  /** Get and clear the pending message (single-use). */
  consumePendingMessage: () => string | null;
  /** Set a pending message to be consumed by the next chat page mount. */
  setPendingMessage: (message: string) => void;
};

const PendingMessageContext = createContext<PendingMessageContextType>({
  pendingMessage: null,
  consumePendingMessage: () => null,
  setPendingMessage: () => {},
});

export function PendingMessageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pendingRef = useRef<string | null>(null);
  const [pendingMessage, setPendingState] = useState<string | null>(null);

  const consumePendingMessage = useCallback(() => {
    const message = pendingRef.current;
    pendingRef.current = null;
    setPendingState(null);
    return message;
  }, []);

  const setPendingMessage = useCallback((message: string) => {
    pendingRef.current = message;
    setPendingState(message);
  }, []);

  return (
    <PendingMessageContext.Provider
      value={{ pendingMessage, consumePendingMessage, setPendingMessage }}
    >
      {children}
    </PendingMessageContext.Provider>
  );
}

export function usePendingMessage() {
  return useContext(PendingMessageContext);
}
