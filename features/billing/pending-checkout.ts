"use client";

import type {
  BillingProvider,
  PaidPlan,
} from "@/lib/billing/types";

export type PendingPaymongoCheckout = {
  provider: "paymongo";
  plan: PaidPlan;
  amount: number;
  currency: "PHP";
  expiresAt: string;
  paymentIntentId: string;
  qrCodeData: string;
};

export type PersistedPendingCheckout = PendingPaymongoCheckout;

const PENDING_CHECKOUT_KEY = "requo:pending-checkout";
const PENDING_CHECKOUT_CHANGE_EVENT = "requo:pending-checkout:change";

type PendingCheckoutChangeDetail = {
  userId: string;
};

function getPendingCheckoutStorageKey(userId: string) {
  return `${PENDING_CHECKOUT_KEY}:${userId}`;
}

function isPaidPlan(value: unknown): value is PaidPlan {
  return value === "pro" || value === "business";
}

function isPendingPaymongoCheckout(
  value: unknown,
): value is PendingPaymongoCheckout {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    candidate.provider === "paymongo" &&
    isPaidPlan(candidate.plan) &&
    typeof candidate.amount === "number" &&
    candidate.currency === "PHP" &&
    typeof candidate.expiresAt === "string" &&
    typeof candidate.paymentIntentId === "string" &&
    typeof candidate.qrCodeData === "string"
  );
}

function isPersistedPendingCheckout(
  value: unknown,
): value is PersistedPendingCheckout {
  return isPendingPaymongoCheckout(value);
}

function dispatchPendingCheckoutChange(userId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<PendingCheckoutChangeDetail>(PENDING_CHECKOUT_CHANGE_EVENT, {
      detail: { userId },
    }),
  );
}

export function getCachedPendingCheckout(
  userId: string,
): PersistedPendingCheckout | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(
      getPendingCheckoutStorageKey(userId),
    );

    if (!raw) {
      return null;
    }

    const data = JSON.parse(raw) as unknown;

    if (!isPersistedPendingCheckout(data)) {
      window.sessionStorage.removeItem(getPendingCheckoutStorageKey(userId));
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export function getCachedPendingCheckoutForPlan(
  userId: string,
  plan: PaidPlan,
): PersistedPendingCheckout | null {
  const pendingCheckout = getCachedPendingCheckout(userId);

  if (!pendingCheckout || pendingCheckout.plan !== plan) {
    return null;
  }

  return pendingCheckout;
}

export function setCachedPendingCheckout(
  userId: string,
  checkout: PersistedPendingCheckout,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      getPendingCheckoutStorageKey(userId),
      JSON.stringify(checkout),
    );
    dispatchPendingCheckoutChange(userId);
  } catch {
    // Ignore unavailable or full storage.
  }
}

export function clearCachedPendingCheckout(
  userId: string,
  provider?: BillingProvider,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (provider) {
      const existing = getCachedPendingCheckout(userId);

      if (!existing || existing.provider !== provider) {
        return;
      }
    }

    window.sessionStorage.removeItem(getPendingCheckoutStorageKey(userId));
    dispatchPendingCheckoutChange(userId);
  } catch {
    // Ignore unavailable storage.
  }
}

export function clearCachedPendingQrCheckout(userId: string): void {
  clearCachedPendingCheckout(userId, "paymongo");
}

export function subscribeToPendingCheckout(
  userId: string,
  callback: (checkout: PersistedPendingCheckout | null) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleChange = () => {
    callback(getCachedPendingCheckout(userId));
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.storageArea !== window.sessionStorage) {
      return;
    }

    const key = event.key;
    if (
      key !== null &&
      key !== getPendingCheckoutStorageKey(userId)
    ) {
      return;
    }

    handleChange();
  };

  const handleCustomEvent = (event: Event) => {
    const customEvent = event as CustomEvent<PendingCheckoutChangeDetail>;

    if (customEvent.detail.userId !== userId) {
      return;
    }

    handleChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(
    PENDING_CHECKOUT_CHANGE_EVENT,
    handleCustomEvent as EventListener,
  );
  handleChange();

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(
      PENDING_CHECKOUT_CHANGE_EVENT,
      handleCustomEvent as EventListener,
    );
  };
}
