"use client";

import { createContext, useCallback, useContext, useRef } from "react";

type PendingMessageContextType = {
  /** Get and clear the pending message (single-use). */
  consumePendingMessage: () => string | null;
  /** Set a pending message to be consumed by the next chat page mount. */
  setPendingMessage: (message: string) => void;
};

const PendingMessageContext = createContext<PendingMessageContextType>({
  consumePendingMessage: () => null,
  setPendingMessage: () => {},
});

export function PendingMessageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pendingRef = useRef<string | null>(null);

  const consumePendingMessage = useCallback(() => {
    const message = pendingRef.current;
    pendingRef.current = null;
    return message;
  }, []);

  const setPendingMessage = useCallback((message: string) => {
    pendingRef.current = message;
  }, []);

  return (
    <PendingMessageContext.Provider
      value={{ consumePendingMessage, setPendingMessage }}
    >
      {children}
    </PendingMessageContext.Provider>
  );
}

export function usePendingMessage() {
  return useContext(PendingMessageContext);
}
