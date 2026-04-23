"use client";

import type {
  BillingCurrency,
  BillingInterval,
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

export type PendingPaddleCheckout = {
  provider: "paddle";
  plan: PaidPlan;
  amount: number;
  currency: Extract<BillingCurrency, "USD">;
  interval: BillingInterval;
  transactionId: string;
};

export type PersistedPendingCheckout =
  | PendingPaymongoCheckout
  | PendingPaddleCheckout;

const PENDING_CHECKOUT_KEY = "requo:pending-checkout";
const PENDING_QR_LEGACY_KEY = "requo:pending-qrph";
const PENDING_CHECKOUT_CHANGE_EVENT = "requo:pending-checkout:change";

type PendingCheckoutChangeDetail = {
  workspaceId: string;
};

function getPendingCheckoutStorageKey(workspaceId: string) {
  return `${PENDING_CHECKOUT_KEY}:${workspaceId}`;
}

function getLegacyPendingQrStorageKey(workspaceId: string) {
  return `${PENDING_QR_LEGACY_KEY}:${workspaceId}`;
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

function isPendingPaddleCheckout(
  value: unknown,
): value is PendingPaddleCheckout {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    candidate.provider === "paddle" &&
    isPaidPlan(candidate.plan) &&
    typeof candidate.amount === "number" &&
    candidate.currency === "USD" &&
    (candidate.interval === "monthly" || candidate.interval === "yearly") &&
    typeof candidate.transactionId === "string"
  );
}

function isPersistedPendingCheckout(
  value: unknown,
): value is PersistedPendingCheckout {
  return isPendingPaymongoCheckout(value) || isPendingPaddleCheckout(value);
}

function dispatchPendingCheckoutChange(workspaceId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<PendingCheckoutChangeDetail>(PENDING_CHECKOUT_CHANGE_EVENT, {
      detail: { workspaceId },
    }),
  );
}

function migrateLegacyPendingQr(
  workspaceId: string,
): PendingPaymongoCheckout | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(
      getLegacyPendingQrStorageKey(workspaceId),
    );

    if (!raw) {
      return null;
    }

    const data = JSON.parse(raw) as Record<string, unknown>;

    if (
      !isPaidPlan(data.plan) ||
      typeof data.amount !== "number" ||
      data.currency !== "PHP" ||
      typeof data.expiresAt !== "string" ||
      typeof data.paymentIntentId !== "string" ||
      typeof data.qrCodeData !== "string"
    ) {
      window.sessionStorage.removeItem(getLegacyPendingQrStorageKey(workspaceId));
      return null;
    }

    const migrated: PendingPaymongoCheckout = {
      amount: data.amount,
      currency: "PHP",
      expiresAt: data.expiresAt,
      paymentIntentId: data.paymentIntentId,
      plan: data.plan,
      provider: "paymongo",
      qrCodeData: data.qrCodeData,
    };

    window.sessionStorage.setItem(
      getPendingCheckoutStorageKey(workspaceId),
      JSON.stringify(migrated),
    );
    window.sessionStorage.removeItem(getLegacyPendingQrStorageKey(workspaceId));
    dispatchPendingCheckoutChange(workspaceId);

    return migrated;
  } catch {
    return null;
  }
}

export function getCachedPendingCheckout(
  workspaceId: string,
): PersistedPendingCheckout | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(
      getPendingCheckoutStorageKey(workspaceId),
    );

    if (!raw) {
      return migrateLegacyPendingQr(workspaceId);
    }

    const data = JSON.parse(raw) as unknown;

    if (!isPersistedPendingCheckout(data)) {
      window.sessionStorage.removeItem(getPendingCheckoutStorageKey(workspaceId));
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export function getCachedPendingCheckoutForPlan(
  workspaceId: string,
  plan: PaidPlan,
): PersistedPendingCheckout | null {
  const pendingCheckout = getCachedPendingCheckout(workspaceId);

  if (!pendingCheckout || pendingCheckout.plan !== plan) {
    return null;
  }

  return pendingCheckout;
}

export function setCachedPendingCheckout(
  workspaceId: string,
  checkout: PersistedPendingCheckout,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      getPendingCheckoutStorageKey(workspaceId),
      JSON.stringify(checkout),
    );
    dispatchPendingCheckoutChange(workspaceId);
  } catch {
    // Ignore unavailable or full storage.
  }
}

export function clearCachedPendingCheckout(
  workspaceId: string,
  provider?: BillingProvider,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (provider) {
      const existing = getCachedPendingCheckout(workspaceId);

      if (!existing || existing.provider !== provider) {
        return;
      }
    }

    window.sessionStorage.removeItem(getPendingCheckoutStorageKey(workspaceId));
    window.sessionStorage.removeItem(getLegacyPendingQrStorageKey(workspaceId));
    dispatchPendingCheckoutChange(workspaceId);
  } catch {
    // Ignore unavailable storage.
  }
}

export function clearCachedPendingQrCheckout(workspaceId: string): void {
  clearCachedPendingCheckout(workspaceId, "paymongo");
}

export function subscribeToPendingCheckout(
  workspaceId: string,
  callback: (checkout: PersistedPendingCheckout | null) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleChange = () => {
    callback(getCachedPendingCheckout(workspaceId));
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.storageArea !== window.sessionStorage) {
      return;
    }

    const key = event.key;
    if (
      key !== null &&
      key !== getPendingCheckoutStorageKey(workspaceId) &&
      key !== getLegacyPendingQrStorageKey(workspaceId)
    ) {
      return;
    }

    handleChange();
  };

  const handleCustomEvent = (event: Event) => {
    const customEvent = event as CustomEvent<PendingCheckoutChangeDetail>;

    if (customEvent.detail.workspaceId !== workspaceId) {
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
