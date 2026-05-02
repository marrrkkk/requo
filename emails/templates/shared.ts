export const emailBrand = {
  appName: "Requo",
  domain: process.env.EMAIL_DOMAIN?.trim() || "test.requo.app",
  logoText: "Requo",
  primaryColor: "#008060",
  primaryTextColor: "#f4fffb",
  backgroundColor: "#f7f9f7",
  cardColor: "#ffffff",
  foregroundColor: "#172b24",
  mutedTextColor: "#5f756c",
  borderColor: "#d6ddd8",
  accentColor: "#e5f5ee",
};

type EmailLayoutInput = {
  label?: string;
  title: string;
  preheader?: string;
  children: string;
  cta?: {
    href: string;
    label: string;
  };
  footerContext?: string;
};

type DetailRow = {
  label: string;
  value: string | number | null | undefined;
};

export function escapeHtml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeAttribute(value: string) {
  return escapeHtml(value);
}

export function renderTextUrl(url: string) {
  return `
    <p style="margin: 14px 0 0; font-size: 12px; line-height: 18px; color: ${emailBrand.mutedTextColor};">
      If the button does not work, copy and paste this link into your browser:<br />
      <a href="${escapeAttribute(url)}" style="color: ${emailBrand.primaryColor}; word-break: break-all; text-decoration: underline;">${escapeHtml(url)}</a>
    </p>
  `;
}

export function renderEmailButton(href: string, label: string) {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0 0;">
      <tr>
        <td style="border-radius: 10px; background: ${emailBrand.primaryColor};">
          <a href="${escapeAttribute(href)}" style="display: inline-block; padding: 13px 18px; border-radius: 10px; background: ${emailBrand.primaryColor}; color: ${emailBrand.primaryTextColor}; font-size: 14px; line-height: 20px; font-weight: 700; text-decoration: none;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>
  `;
}

export function renderDetailsCard(title: string, rows: DetailRow[]) {
  const visibleRows = rows.filter(
    (row) => row.value !== null && row.value !== undefined && `${row.value}` !== "",
  );

  if (!visibleRows.length) {
    return "";
  }

  return `
    <div style="margin: 22px 0; border: 1px solid ${emailBrand.borderColor}; border-radius: 14px; background: ${emailBrand.cardColor}; overflow: hidden;">
      <div style="padding: 14px 16px; border-bottom: 1px solid ${emailBrand.borderColor}; background: ${emailBrand.accentColor};">
        <p style="margin: 0; color: ${emailBrand.foregroundColor}; font-size: 13px; line-height: 18px; font-weight: 700;">${escapeHtml(title)}</p>
      </div>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse;">
        ${visibleRows
          .map(
            (row) => `
              <tr>
                <td style="width: 38%; padding: 12px 16px; border-bottom: 1px solid ${emailBrand.borderColor}; color: ${emailBrand.mutedTextColor}; font-size: 13px; line-height: 18px;">${escapeHtml(row.label)}</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid ${emailBrand.borderColor}; color: ${emailBrand.foregroundColor}; font-size: 13px; line-height: 18px; font-weight: 600;">${escapeHtml(row.value ?? "")}</td>
              </tr>
            `,
          )
          .join("")}
      </table>
    </div>
  `;
}

export function renderNoteCard(title: string, body: string) {
  if (!body.trim()) {
    return "";
  }

  return `
    <div style="margin: 22px 0; border: 1px solid ${emailBrand.borderColor}; border-radius: 14px; background: ${emailBrand.backgroundColor}; padding: 16px;">
      <p style="margin: 0 0 8px; color: ${emailBrand.foregroundColor}; font-size: 13px; line-height: 18px; font-weight: 700;">${escapeHtml(title)}</p>
      <p style="margin: 0; color: ${emailBrand.foregroundColor}; font-size: 14px; line-height: 22px;">${escapeHtml(body).replace(/\n/g, "<br />")}</p>
    </div>
  `;
}

export function renderEmailLayout({
  label,
  title,
  preheader,
  children,
  cta,
  footerContext,
}: EmailLayoutInput) {
  return `<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin: 0; padding: 0; background: ${emailBrand.backgroundColor};">
    ${
      preheader
        ? `<div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">${escapeHtml(preheader)}</div>`
        : ""
    }
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; background: ${emailBrand.backgroundColor};">
      <tr>
        <td align="center" style="padding: 32px 16px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; max-width: 620px;">
            <tr>
              <td style="padding: 0 2px 14px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="color: ${emailBrand.foregroundColor}; font-family: Arial, sans-serif; font-size: 22px; line-height: 28px; font-weight: 800; letter-spacing: 0;">
                      ${escapeHtml(emailBrand.logoText)}
                    </td>
                    ${
                      label
                        ? `<td align="right" style="color: ${emailBrand.mutedTextColor}; font-family: Arial, sans-serif; font-size: 12px; line-height: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">${escapeHtml(label)}</td>`
                        : ""
                    }
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="border: 1px solid ${emailBrand.borderColor}; border-radius: 18px; background: ${emailBrand.cardColor}; padding: 30px; font-family: Arial, sans-serif; color: ${emailBrand.foregroundColor};">
                <h1 style="margin: 0 0 12px; color: ${emailBrand.foregroundColor}; font-family: Arial, sans-serif; font-size: 26px; line-height: 32px; font-weight: 800; letter-spacing: 0;">${escapeHtml(title)}</h1>
                ${children}
                ${cta ? renderEmailButton(cta.href, cta.label) : ""}
                ${cta ? renderTextUrl(cta.href) : ""}
              </td>
            </tr>
            <tr>
              <td style="padding: 18px 2px 0; font-family: Arial, sans-serif; color: ${emailBrand.mutedTextColor}; font-size: 12px; line-height: 18px;">
                <p style="margin: 0;">Sent by ${emailBrand.appName}${footerContext ? ` for ${escapeHtml(footerContext)}` : ""}.</p>
                <p style="margin: 4px 0 0;">${escapeHtml(emailBrand.domain)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
