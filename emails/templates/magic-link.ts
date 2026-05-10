import { emailBrand, renderEmailLayout } from "./shared";

type MagicLinkTemplateInput = {
  signInUrl: string;
};

export function renderMagicLinkEmail({ signInUrl }: MagicLinkTemplateInput) {
  const subject = "Your Requo sign-in link";
  const text = `Use this secure link to sign in to Requo:

${signInUrl}

If you did not request this link, you can ignore this email.`;

  const html = renderEmailLayout({
    label: "Account",
    title: "Sign in to Requo",
    preheader: "Use this one-time link to sign in. It expires soon.",
    footerContext: emailBrand.appName,
    cta: {
      href: signInUrl,
      label: "Sign in to Requo",
    },
    children: `
      <p style="margin: 0 0 14px; color: ${emailBrand.foregroundColor}; font-size: 15px; line-height: 24px;">Use the button below to sign in. This link is private and should only be used by you.</p>
      <p style="margin: 18px 0 0; color: ${emailBrand.mutedTextColor}; font-size: 13px; line-height: 20px;">If you did not request this, you can ignore this email.</p>
    `,
  });

  return {
    subject,
    text,
    html,
  };
}
