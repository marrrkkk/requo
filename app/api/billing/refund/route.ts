import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { isPaddleConfigured } from "@/lib/env";
import {
  requestRefundForPayment,
  type RefundFailureReason,
} from "@/lib/billing/refunds";

const refundRequestSchema = z.object({
  paymentAttemptId: z
    .string()
    .trim()
    .min(1, "Payment attempt ID is required.")
    .max(128, "Payment attempt ID is too long."),
  reason: z
    .string()
    .trim()
    .max(500, "Reason must be 500 characters or fewer.")
    .optional(),
});

function statusForReason(reason: RefundFailureReason): number {
  switch (reason) {
    case "not_found":
    case "not_yours":
      return 404;
    case "not_completed":
    case "outside_window":
    case "unsupported_provider":
      return 409;
    case "already_refunded":
    case "refund_in_progress":
      return 409;
    case "provider_error":
    case "internal_error":
    default:
      return 500;
  }
}

export async function POST(request: Request) {
  if (!isPaddleConfigured) {
    return NextResponse.json(
      { error: "Refunds are not available in this environment." },
      { status: 503 },
    );
  }

  const user = await requireUser();

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const parsed = refundRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid refund request." },
      { status: 400 },
    );
  }

  const result = await requestRefundForPayment({
    paymentAttemptId: parsed.data.paymentAttemptId,
    userId: user.id,
    reason: parsed.data.reason?.trim() || "customer requested refund",
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.message, reason: result.reason },
      { status: statusForReason(result.reason) },
    );
  }

  return NextResponse.json({
    refund: {
      id: result.refund.id,
      status: result.refund.status,
      paymentAttemptId: result.refund.paymentAttemptId,
      providerAdjustmentId: result.refund.providerAdjustmentId,
      createdAt: result.refund.createdAt,
    },
  });
}
