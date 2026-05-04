import { emailBrand, escapeHtml, renderEmailLayout } from "./shared";

type EmailVerificationTemplateInput = {
  name: string;
  verificationUrl: string;
};

export function renderEmailVerificationEmail({
  name,
  verificationUrl,
}: EmailVerificationTemplateInput) {
  const subject = "Verify your Requo email";
  const text = `Hi ${name},

Verify your email to finish setting up your Requo account.

Open this secure verification link:
${verificationUrl}

If you did not create this account, you can ignore this email.`;

  const html = renderEmailLayout({
    label: "Account",
    title: "Verify your Requo email",
    preheader: "Confirm your email address to finish setting up Requo.",
    footerContext: emailBrand.appName,
    cta: {
      href: verificationUrl,
      label: "Verify email",
    },
    children: `
      <p style="margin: 0 0 14px; color: ${emailBrand.foregroundColor}; font-size: 15px; line-height: 24px;">Hi ${escapeHtml(name)},</p>
      <p style="margin: 0; color: ${emailBrand.foregroundColor}; font-size: 15px; line-height: 24px;">Verify your email to finish setting up your Requo account.</p>
      <p style="margin: 18px 0 0; color: ${emailBrand.mutedTextColor}; font-size: 13px; line-height: 20px;">If you did not create this account, you can ignore this email.</p>
    `,
  });

  return {
    html,
    subject,
    text,
  };
}
