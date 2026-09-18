import { handlePaymentWebhook } from "@/lib/payments/route-handler";

export const maxDuration = 30;

type RouteContext = { params: Promise<{ connectionId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { connectionId } = await context.params;
  return handlePaymentWebhook(request, { provider: "paypal", connectionId });
}
