import { emailBrand, escapeHtml, renderEmailLayout } from "./shared";

type PasswordResetTemplateInput = {
  name: string;
  resetUrl: string;
};

export function renderPasswordResetEmail({
  name,
  resetUrl,
}: PasswordResetTemplateInput) {
  const subject = "Reset your Requo password";
  const text = `Hi ${name},

We received a request to reset your Requo password.

Reset your password here:
${resetUrl}

If you did not request this, you can ignore this email.`;

  const html = renderEmailLayout({
    label: "Account",
    title: "Reset your Requo password",
    preheader: "Use this secure link to reset your Requo password.",
    footerContext: emailBrand.appName,
    cta: {
      href: resetUrl,
      label: "Reset password",
    },
    children: `
      <p style="margin: 0 0 14px; color: ${emailBrand.foregroundColor}; font-size: 15px; line-height: 24px;">Hi ${escapeHtml(name)},</p>
      <p style="margin: 0; color: ${emailBrand.foregroundColor}; font-size: 15px; line-height: 24px;">We received a request to reset your Requo password. This link is private and should only be used by you.</p>
      <p style="margin: 18px 0 0; color: ${emailBrand.mutedTextColor}; font-size: 13px; line-height: 20px;">If you did not request this, you can ignore this email.</p>
    `,
  });

  return {
    subject,
    text,
    html,
  };
}
