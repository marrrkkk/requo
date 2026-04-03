type PasswordResetTemplateInput = {
  name: string;
  resetUrl: string;
};

export function renderPasswordResetEmail({
  name,
  resetUrl,
}: PasswordResetTemplateInput) {
  const subject = "Reset your Relay password";
  const text = `Hi ${name},

We received a request to reset your Relay password.

Reset your password here:
${resetUrl}

If you did not request this, you can ignore this email.`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #172033;">
      <h1 style="font-size: 24px; margin-bottom: 16px;">Reset your Relay password</h1>
      <p>Hi ${name},</p>
      <p>We received a request to reset your Relay password.</p>
      <p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 12px; background: #2d4ea0; color: #ffffff; text-decoration: none; font-weight: 600;">
          Reset password
        </a>
      </p>
      <p>If you did not request this, you can ignore this email.</p>
    </div>
  `;

  return {
    subject,
    text,
    html,
  };
}
