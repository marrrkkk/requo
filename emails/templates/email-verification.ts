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

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #172033;">
      <h1 style="font-size: 24px; margin-bottom: 16px;">Verify your Requo email</h1>
      <p>Hi ${name},</p>
      <p>Verify your email to finish setting up your Requo account.</p>
      <p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 12px; background: #2d4ea0; color: #ffffff; text-decoration: none; font-weight: 600;">
          Verify email
        </a>
      </p>
      <p>If you did not create this account, you can ignore this email.</p>
    </div>
  `;

  return {
    html,
    subject,
    text,
  };
}
