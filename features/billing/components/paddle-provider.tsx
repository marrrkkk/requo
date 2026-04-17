"use client";

/**
 * Paddle.js provider component.
 *
 * Loads the Paddle.js script and provides utilities for opening
 * the overlay checkout. Must wrap any component that triggers
 * Paddle checkout.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type PaddleInstance = {
  Checkout: {
    open: (params: {
      transactionId: string;
      settings?: {
        successUrl?: string;
        theme?: "light" | "dark";
        locale?: string;
      };
    }) => void;
  };
  Environment: {
    set: (env: "sandbox" | "production") => void;
  };
  Setup: (params: {
    token: string;
    eventCallback?: (event: PaddleCheckoutEvent) => void;
  }) => void;
};

type PaddleCheckoutEvent = {
  name: string;
  data?: Record<string, unknown>;
};

type PaddleContextValue = {
  isReady: boolean;
  openCheckout: (transactionId: string, onComplete?: () => void) => void;
};

const PaddleContext = createContext<PaddleContextValue>({
  isReady: false,
  openCheckout: () => {},
});

export function usePaddle() {
  return useContext(PaddleContext);
}

declare global {
  interface Window {
    Paddle?: PaddleInstance;
  }
}

type PaddleProviderProps = {
  clientToken: string;
  environment?: "sandbox" | "production";
  children: ReactNode;
};

export function PaddleProvider({
  clientToken,
  environment = "sandbox",
  children,
}: PaddleProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const onCompleteRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Don't load if already present
    if (window.Paddle) {
      window.Paddle.Setup({
        token: clientToken,
        eventCallback: handleEvent,
      });
      setIsReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;
    script.onload = () => {
      if (window.Paddle) {
        if (environment === "sandbox") {
          window.Paddle.Environment.set("sandbox");
        }
        window.Paddle.Setup({
          token: clientToken,
          eventCallback: handleEvent,
        });
        setIsReady(true);
      }
    };
    script.onerror = () => {
      console.error("[Paddle] Failed to load Paddle.js");
    };

    document.head.appendChild(script);

    return () => {
      // Don't remove the script — Paddle.js should persist
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientToken, environment]);

  function handleEvent(event: PaddleCheckoutEvent) {
    if (
      event.name === "checkout.completed" ||
      event.name === "checkout.closed"
    ) {
      if (event.name === "checkout.completed") {
        onCompleteRef.current?.();
      }
      onCompleteRef.current = null;
    }
  }

  const openCheckout = useCallback(
    (transactionId: string, onComplete?: () => void) => {
      if (!window.Paddle) {
        console.error("[Paddle] Paddle.js not loaded");
        return;
      }

      onCompleteRef.current = onComplete ?? null;

      window.Paddle.Checkout.open({
        transactionId,
      });
    },
    [],
  );

  return (
    <PaddleContext.Provider value={{ isReady, openCheckout }}>
      {children}
    </PaddleContext.Provider>
  );
}
