export {
  type BillingProvider,
  type BillingCurrency,
  type BillingInterval,
  type SubscriptionStatus,
  type BillingRegion,
  type PaidPlan,
  type PlanPricing,
  type CheckoutResult,
  type WebhookProcessResult,
} from "./types";

export {
  planPricing,
  getPlanPrice,
  formatPrice,
  getPlanPriceLabel,
  getCurrencySymbol,
} from "./plans";

export {
  getBillingRegion,
  getBillingRegionFromCountry,
  getDefaultCurrency,
  getDefaultProvider,
  getProviderForCurrency,
  isPhilippinesRegion,
} from "./region";

export {
  getCurrentPlan,
  hasActiveSubscription,
  canCreateBusiness,
  canUseFeature,
  canAccessBillingFeature,
  canRequestRefund,
} from "./feature-gate";

export {
  USD_TO_PHP_RATE,
  getPhpApproximation,
  formatPhpApproximation,
  getPhpDisclaimer,
} from "./adaptive-currency";

export { getBillingProvider } from "./providers";
export type {
  BillingProviderInterface,
  CancelSubscriptionResult,
  CheckoutSessionParams,
  CheckoutSessionResult,
  NormalizedEventType,
  NormalizedWebhookEvent,
  RefundResult,
} from "./providers/interface";

export { isDodoConfigured } from "@/lib/env";
