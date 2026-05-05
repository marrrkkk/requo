import type { WorkspacePlan } from "@/lib/plans/plans";
import type {
  BillingCurrency,
  BillingProvider,
  BillingRegion,
  PaymentAttemptStatus,
  PaidPlan,
  SubscriptionStatus,
} from "@/lib/billing/types";

/** Billing overview for the workspace billing UI. */
export type WorkspaceBillingOverview = {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  currentPlan: WorkspacePlan;
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

/** Props for the checkout dialog. */
export type CheckoutDialogProps = {
  workspaceId: string;
  workspaceSlug: string;
  currentPlan: WorkspacePlan;
  plan: PaidPlan;
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
    effectivePlan: WorkspacePlan;
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
