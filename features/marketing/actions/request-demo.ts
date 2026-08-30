"use server";

import { z } from "zod";

import { sendEmailWithFallback } from "@/lib/email";
import { getEmailSender } from "@/lib/email/senders";
import { assertPublicActionRateLimit } from "@/lib/public-action-rate-limit";

const requestDemoSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.email("Please enter a valid email address"),
  message: z.string().trim().max(2000).optional(),
});

export type RequestDemoState = {
  success?: boolean;
  error?: string;
  fieldErrors?: {
    name?: string[];
    email?: string[];
    message?: string[];
  };
};

const DEMO_RECIPIENT =
  process.env.DEMO_REQUEST_EMAIL ??
  (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean)[0] ??
  "";

export async function requestDemo(
  _prevState: RequestDemoState,
  formData: FormData,
): Promise<RequestDemoState> {
  const parsed = requestDemoSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;

    return {
      error: "Please check the form for errors.",
      fieldErrors: {
        name: fieldErrors.name,
        email: fieldErrors.email,
        message: fieldErrors.message,
      },
    };
  }

  const { name, email, message } = parsed.data;

  // Rate limit: 3 requests per 15 minutes per IP
  const allowed = await assertPublicActionRateLimit({
    action: "demo-request",
    scope: `demo-request:${email}`,
    limit: 3,
    windowMs: 15 * 60 * 1000,
  });

  if (!allowed) {
    return {
      error: "You've already submitted a request recently. We'll be in touch soon.",
    };
  }

  if (!DEMO_RECIPIENT) {
    console.error(
      "Demo request received but no recipient configured. Set DEMO_REQUEST_EMAIL or ADMIN_EMAILS.",
    );

    // Still show success to the user — we don't want to expose config issues
    return { success: true };
  }

  try {
    const idempotencyKey = `demo-request:${email}:${Date.now()}`;
    const htmlBody = buildDemoRequestEmail({ name, email, message });

    await sendEmailWithFallback({
      to: DEMO_RECIPIENT,
      from: getEmailSender("support"),
      replyTo: email,
      subject: `Demo request from ${name}`,
      html: htmlBody,
      text: `Demo request from ${name} (${email})\n\n${message ?? "No message provided."}`,
      emailType: "support",
      idempotencyKey,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send demo request email:", error);

    return {
      error: "Something went wrong. Please try again or reach out directly.",
    };
  }
}

function buildDemoRequestEmail({
  name,
  email,
  message,
}: {
  name: string;
  email: string;
  message?: string;
}) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 0;">
      <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 20px;">New demo request</h2>

      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 8px 12px 8px 0; color: #6b7280; white-space: nowrap; vertical-align: top;">Name</td>
          <td style="padding: 8px 0; font-weight: 500;">${escapeHtml(name)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px 8px 0; color: #6b7280; white-space: nowrap; vertical-align: top;">Email</td>
          <td style="padding: 8px 0;"><a href="mailto:${escapeHtml(email)}" style="color: #2563eb;">${escapeHtml(email)}</a></td>
        </tr>
        ${
          message
            ? `<tr>
          <td style="padding: 8px 12px 8px 0; color: #6b7280; white-space: nowrap; vertical-align: top;">Message</td>
          <td style="padding: 8px 0;">${escapeHtml(message)}</td>
        </tr>`
            : ""
        }
      </table>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0 16px;" />
      <p style="font-size: 12px; color: #9ca3af; margin: 0;">
        Reply directly to this email to respond to ${escapeHtml(name)}.
      </p>
    </div>
  `.trim();
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
