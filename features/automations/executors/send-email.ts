import type { ActionInput } from "./index";
import type { ActionResult } from "../types";
import { sendEmailWithFallback } from "@/lib/email/send-email";
import { db } from "@/lib/db/client";
import { businesses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Sends a templated email via the existing email infrastructure (Resend + fallback),
 * supporting dynamic variables from the trigger payload.
 * (Requirement 4.4)
 */
export async function executeSendEmail(
  input: ActionInput,
): Promise<ActionResult> {
  const config = input.actionConfig as Extract<
    typeof input.actionConfig,
    { type: "send_email" }
  >;
  const payload = input.triggerPayload as Record<string, unknown>;

  // Determine recipient — from config override or trigger payload
  const recipientEmail =
    config.recipientEmail ?? (payload.recipientEmail as string | undefined);

  if (!recipientEmail) {
    return {
      success: false,
      error:
        "Cannot send email: no recipient email in action config or trigger payload.",
    };
  }

  // Get business name for variable interpolation
  const [business] = await db
    .select({ name: businesses.name })
    .from(businesses)
    .where(eq(businesses.id, input.businessId))
    .limit(1);

  const businessName = business?.name ?? "Your Service Provider";

  // Build dynamic variable map for template interpolation
  const variables: Record<string, string> = {
    businessName,
    customerName: String(payload.customerName ?? ""),
    quoteNumber: String(payload.quoteNumber ?? ""),
    amount: payload.amount != null ? String(payload.amount) : "",
    recipientEmail,
  };

  // Interpolate variables in subject and body using {{variableName}} syntax
  const subject = interpolateTemplate(config.subject, variables);
  const body = interpolateTemplate(config.body, variables);

  // Wrap body in basic HTML
  const html = `<div style="font-family: sans-serif; line-height: 1.6;">${body.replace(/\n/g, "<br>")}</div>`;

  const idempotencyKey = `automation:${input.businessId}:${Date.now()}:${recipientEmail}`;

  await sendEmailWithFallback({
    to: recipientEmail,
    subject,
    html,
    text: body,
    idempotencyKey,
    emailType: "notification",
    businessId: input.businessId,
  });

  return {
    success: true,
    result: { recipientEmail, subject },
  };
}

/**
 * Replace {{variableName}} placeholders with values from the variables map.
 */
function interpolateTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return variables[key] ?? "";
  });
}
