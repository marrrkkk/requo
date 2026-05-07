import type { BusinessPlan as plan } from "@/lib/plans/plans";
import type {
  BillingCurrency,
  BillingInterval,
  BillingProvider,
  BillingRegion,
  PaymentAttemptStatus,
  PaidPlan,
  SubscriptionStatus,
} from "@/lib/billing/types";

/** Billing overview for the account billing UI. */
export type AccountBillingOverview = {
  userId: string;
  /** Current business context (for display and navigation). */
  businessId: string;
  businessName: string;
  businessSlug: string;
  currentPlan: plan;
  subscription: {
    status: SubscriptionStatus;
    plan: string;
    provider: BillingProvider;
    currency: BillingCurrency;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    canceledAt: Date | null;
    providerSubscriptionId: string | null;
  } | null;
  region: BillingRegion;
  defaultCurrency: BillingCurrency;
};

/** @deprecated Use `AccountBillingOverview` instead. */
export type WorkspaceBillingOverview = AccountBillingOverview;

/** Props for the checkout dialog. */
export type CheckoutDialogProps = {
  userId: string;
  businessId: string;
  businessName?: string;
  businessSlug: string;
  currentPlan: plan;
  plan: PaidPlan;
  interval?: BillingInterval;
  region: BillingRegion;
  defaultCurrency: BillingCurrency;
};

/** Checkout action state for server action form submissions. */
export type CheckoutActionState = {
  error?: string;
  success?: string;
  checkoutUrl?: string;
  paddleTransactionId?: string;
  qrData?: {
    qrCodeData: string;
    paymentIntentId: string;
    expiresAt: string;
    amount: number;
    currency: "PHP";
  };
};

/** Pending QRPh checkout data loaded from the server. */
export type PendingQrPhData = {
  qrCodeData: string;
  paymentIntentId: string;
  expiresAt: string;
  amount: number;
  currency: "PHP";
  plan: PaidPlan;
};

export type PendingCheckoutState = {
  provider: "paymongo";
} & PendingQrPhData;

export type CancelPendingQrCheckoutResult =
  | {
      ok: true;
      outcome: "canceled" | "already_canceled";
    }
  | {
      ok: true;
      outcome: "already_paid";
    }
  | {
      ok: false;
      error: string;
    };

export type CheckoutStatusSnapshot = {
  subscription: {
    effectivePlan: plan;
    plan: string;
    status: SubscriptionStatus;
  } | null;
  paymentAttempt: {
    providerPaymentId: string;
    status: PaymentAttemptStatus;
  } | null;
};

/** Cancel action state. */
export type CancelActionState = {
  error?: string;
  success?: string;
};
