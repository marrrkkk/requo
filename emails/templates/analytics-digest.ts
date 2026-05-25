import {
  emailBrand,
  escapeHtml,
  renderEmailLayout,
} from "./shared";

type MetricDelta = {
  label: string;
  current: number;
  prior: number;
  format?: "number" | "percent" | "currency";
};

type AnalyticsDigestTemplateInput = {
  businessName: string;
  weekStartDate: string;
  weekEndDate: string;
  metrics: MetricDelta[];
  recommendations: string[];
  dashboardUrl: string;
};

function formatValue(value: number, format: MetricDelta["format"]): string {
  switch (format) {
    case "percent":
      return `${(value * 100).toFixed(1)}%`;
    case "currency":
      return `$${(value / 100).toFixed(2)}`;
    default:
      return String(value);
  }
}

function getDeltaPercent(current: number, prior: number): number {
  if (prior === 0 && current === 0) return 0;
  if (prior === 0) return 100;
  return Math.round(((current - prior) / prior) * 100);
}

function getDeltaIndicator(current: number, prior: number): { arrow: string; color: string; text: string } {
  const delta = current - prior;
  const pct = getDeltaPercent(current, prior);

  if (delta > 0) {
    return { arrow: "↑", color: "#16a34a", text: `+${pct}%` };
  }
  if (delta < 0) {
    return { arrow: "↓", color: "#dc2626", text: `${pct}%` };
  }
  return { arrow: "→", color: emailBrand.mutedTextColor, text: "no change" };
}

function renderMetricRow(metric: MetricDelta): string {
  const { arrow, color, text } = getDeltaIndicator(metric.current, metric.prior);
  const currentFormatted = formatValue(metric.current, metric.format);

  return `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid ${emailBrand.borderColor}; color: ${emailBrand.foregroundColor}; font-size: 14px; line-height: 20px;">
        ${escapeHtml(metric.label)}
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid ${emailBrand.borderColor}; color: ${emailBrand.foregroundColor}; font-size: 14px; line-height: 20px; font-weight: 600; text-align: right;">
        ${escapeHtml(currentFormatted)}
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid ${emailBrand.borderColor}; font-size: 14px; line-height: 20px; font-weight: 600; text-align: right; color: ${color};">
        ${arrow} ${escapeHtml(text)}
      </td>
    </tr>
  `;
}

export function renderAnalyticsDigestEmail({
  businessName,
  weekStartDate,
  weekEndDate,
  metrics,
  recommendations,
  dashboardUrl,
}: AnalyticsDigestTemplateInput) {
  const subject = `Weekly analytics digest for ${businessName}`;

  const metricsTable = `
    <div style="margin: 22px 0; border: 1px solid ${emailBrand.borderColor}; border-radius: 14px; background: ${emailBrand.cardColor}; overflow: hidden;">
      <div style="padding: 14px 16px; border-bottom: 1px solid ${emailBrand.borderColor}; background: ${emailBrand.accentColor};">
        <p style="margin: 0; color: ${emailBrand.foregroundColor}; font-size: 13px; line-height: 18px; font-weight: 700;">Week-over-week performance</p>
        <p style="margin: 4px 0 0; color: ${emailBrand.mutedTextColor}; font-size: 12px; line-height: 16px;">${escapeHtml(weekStartDate)} – ${escapeHtml(weekEndDate)}</p>
      </div>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 16px; border-bottom: 1px solid ${emailBrand.borderColor}; color: ${emailBrand.mutedTextColor}; font-size: 12px; line-height: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Metric</td>
          <td style="padding: 10px 16px; border-bottom: 1px solid ${emailBrand.borderColor}; color: ${emailBrand.mutedTextColor}; font-size: 12px; line-height: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; text-align: right;">This week</td>
          <td style="padding: 10px 16px; border-bottom: 1px solid ${emailBrand.borderColor}; color: ${emailBrand.mutedTextColor}; font-size: 12px; line-height: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; text-align: right;">Change</td>
        </tr>
        ${metrics.map(renderMetricRow).join("")}
      </table>
    </div>
  `;

  const recommendationsHtml = recommendations.length > 0
    ? `
      <div style="margin: 22px 0; border: 1px solid ${emailBrand.borderColor}; border-radius: 14px; background: ${emailBrand.backgroundColor}; padding: 16px;">
        <p style="margin: 0 0 10px; color: ${emailBrand.foregroundColor}; font-size: 13px; line-height: 18px; font-weight: 700;">Recommended actions</p>
        ${recommendations
          .map(
            (rec) =>
              `<p style="margin: 6px 0; color: ${emailBrand.foregroundColor}; font-size: 14px; line-height: 22px;">• ${escapeHtml(rec)}</p>`,
          )
          .join("")}
      </div>
    `
    : "";

  const html = renderEmailLayout({
    label: "Analytics",
    title: "Your weekly digest",
    preheader: `${businessName} analytics for ${weekStartDate} – ${weekEndDate}`,
    footerContext: businessName,
    cta: {
      href: dashboardUrl,
      label: "View full dashboard",
    },
    children: `
      <p style="margin: 0; color: ${emailBrand.foregroundColor}; font-size: 15px; line-height: 24px;">Here's how ${escapeHtml(businessName)} performed this week compared to last week.</p>
      ${metricsTable}
      ${recommendationsHtml}
    `,
  });

  const text = [
    `Weekly analytics digest for ${businessName}`,
    `${weekStartDate} – ${weekEndDate}`,
    "",
    ...metrics.map((m) => {
      const { arrow, text: deltaText } = getDeltaIndicator(m.current, m.prior);
      return `${m.label}: ${formatValue(m.current, m.format)} ${arrow} ${deltaText}`;
    }),
    "",
    ...(recommendations.length > 0
      ? ["Recommended actions:", ...recommendations.map((r) => `• ${r}`), ""]
      : []),
    `View dashboard: ${dashboardUrl}`,
  ].join("\n");

  return { subject, html, text };
}
