import { NextResponse } from "next/server";

import { getPlanPrice } from "@/lib/billing/plans";
import { createPaddleTransaction } from "@/lib/billing/providers/paddle";
import {
  getAccountSubscription,
  resolveEffectivePlanFromSubscription,
} from "@/lib/billing/subscription-service";
import { recordPaymentAttempt } from "@/lib/billing/webhook-processor";
import { requireUser } from "@/lib/auth/session";
import { getBusinessContextForUser } from "@/lib/db/business-access";
import { isPaddleConfigured } from "@/lib/env";
import type { BillingInterval, PaidPlan } from "@/lib/billing/types";

type CheckoutRequestBody = {
  businessId?: string;
  interval?: string;
  plan?: string;
};

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as CheckoutRequestBody;

    const businessId = body.businessId;
    const plan = body.plan;
    const interval = body.interval === "yearly" ? "yearly" : "monthly";

    if (
      typeof businessId !== "string" ||
      typeof plan !== "string" ||
      (plan !== "pro" && plan !== "business")
    ) {
      return NextResponse.json({ error: "Invalid checkout input." }, { status: 400 });
    }

    const businessContext = await getBusinessContextForUser(user.id, businessId);
    if (!businessContext) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }
    if (businessContext.role !== "owner") {
      return NextResponse.json(
        { error: "Only business owners can manage billing." },
        { status: 403 },
      );
    }

    const existingSubscription = await getAccountSubscription(user.id);
    const currentPlan = existingSubscription
      ? resolveEffectivePlanFromSubscription(existingSubscription)
      : "free";
    if (currentPlan === plan) {
      return NextResponse.json(
        { error: `You're already on the ${plan} plan.` },
        { status: 400 },
      );
    }

    if (!isPaddleConfigured) {
      return NextResponse.json(
        { error: "Paddle checkout is not configured." },
        { status: 503 },
      );
    }

    const typedPlan = plan as PaidPlan;
    const typedInterval = interval as BillingInterval;
    const result = await createPaddleTransaction({
      plan: typedPlan,
      userId: user.id,
      businessId,
      userEmail: user.email,
      userName: user.name,
      interval: typedInterval,
    });

    if (result.type === "error") {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    await recordPaymentAttempt({
      amount: getPlanPrice(typedPlan, "USD", typedInterval),
      currency: "USD",
      plan: typedPlan,
      provider: "paddle",
      providerPaymentId: result.url,
      status: "pending",
      userId: user.id,
      businessId,
    });

    return NextResponse.json({ transactionId: result.url });
  } catch {
    return NextResponse.json(
      { error: "Unable to initialize checkout." },
      { status: 500 },
    );
  }
}
