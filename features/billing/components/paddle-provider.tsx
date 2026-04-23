"use client";

/**
 * Paddle.js provider component.
 *
 * Loads Paddle.js and exposes helpers for opening inline or overlay checkout.
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

type PaddleCheckoutSettings = {
  displayMode?: "overlay" | "inline";
  frameTarget?: string;
  frameInitialHeight?: string;
  frameStyle?: string;
  theme?: "light" | "dark";
  locale?: string;
  successUrl?: string;
};

type PaddleCheckoutEvent = {
  name: string;
  data?: Record<string, unknown>;
};

type PaddleInstance = {
  Checkout: {
    close: () => void;
    open: (params: {
      settings?: PaddleCheckoutSettings;
      transactionId: string;
    }) => void;
  };
  Environment: {
    set: (env: "sandbox" | "production") => void;
  };
  Setup: (params: {
    eventCallback?: (event: PaddleCheckoutEvent) => void;
    token: string;
  }) => void;
};

type CheckoutHandlers = {
  onClose?: () => void;
  onComplete?: () => void;
  onError?: (message: string) => void;
  onPaymentFailed?: (message: string) => void;
};

type PaddleContextValue = {
  isReady: boolean;
  openCheckout: (
    transactionId: string,
    handlers?: CheckoutHandlers,
    settings?: PaddleCheckoutSettings,
  ) => void;
  closeCheckout: () => void;
};

const PaddleContext = createContext<PaddleContextValue>({
  closeCheckout: () => {},
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
  children: ReactNode;
  clientToken: string;
  environment?: "sandbox" | "production";
};

export function PaddleProvider({
  children,
  clientToken,
  environment = "sandbox",
}: PaddleProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const checkoutCompletedRef = useRef(false);
  const checkoutHandlersRef = useRef<CheckoutHandlers | null>(null);

  const handleEvent = useCallback((event: PaddleCheckoutEvent) => {
    if (event.name === "checkout.completed") {
      checkoutCompletedRef.current = true;
      checkoutHandlersRef.current?.onComplete?.();
      checkoutHandlersRef.current = null;
      return;
    }

    if (event.name === "checkout.payment.failed") {
      const errorMessage =
        typeof event.data?.error === "string"
          ? event.data.error
          : typeof event.data?.message === "string"
            ? event.data.message
            : "Payment failed. Please try again.";

      checkoutHandlersRef.current?.onPaymentFailed?.(errorMessage);
      return;
    }

    if (event.name === "checkout.error") {
      const errorMessage =
        typeof event.data?.message === "string"
          ? event.data.message
          : "Unable to open the checkout. Please try again.";

      checkoutHandlersRef.current?.onError?.(errorMessage);
      return;
    }

    if (event.name === "checkout.closed") {
      if (!checkoutCompletedRef.current) {
        checkoutHandlersRef.current?.onClose?.();
      }

      checkoutCompletedRef.current = false;
      checkoutHandlersRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (window.Paddle) {
      window.Paddle.Setup({
        eventCallback: handleEvent,
        token: clientToken,
      });
      queueMicrotask(() => {
        setIsReady(true);
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;
    script.onload = () => {
      if (!window.Paddle) {
        return;
      }

      if (environment === "sandbox") {
        window.Paddle.Environment.set("sandbox");
      }

      window.Paddle.Setup({
        eventCallback: handleEvent,
        token: clientToken,
      });
      setIsReady(true);
    };
    script.onerror = () => {
      console.error("[Paddle] Failed to load Paddle.js");
    };

    document.head.appendChild(script);

    return () => {
      // Keep the script mounted for future checkouts.
    };
  }, [clientToken, environment, handleEvent]);

  const openCheckout = useCallback(
    (
      transactionId: string,
      handlers?: CheckoutHandlers,
      settings?: PaddleCheckoutSettings,
    ) => {
      if (!window.Paddle) {
        console.error("[Paddle] Paddle.js not loaded");
        return;
      }

      checkoutCompletedRef.current = false;
      checkoutHandlersRef.current = handlers ?? null;

      window.Paddle.Checkout.open({
        ...(settings ? { settings } : {}),
        transactionId,
      });
    },
    [],
  );

  const closeCheckout = useCallback(() => {
    if (!window.Paddle) {
      return;
    }

    checkoutCompletedRef.current = false;
    window.Paddle.Checkout.close();
  }, []);

  return (
    <PaddleContext.Provider value={{ closeCheckout, isReady, openCheckout }}>
      {children}
    </PaddleContext.Provider>
  );
}
