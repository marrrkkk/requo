import {
  emailBrand,
  escapeHtml,
  renderEmailLayout,
} from "./shared";

type MetricRow = {
  label: string;
  value: number;
  format?: "number" | "percent" | "currency";
};

type AnalyticsScheduledReportTemplateInput = {
  businessName: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  metrics: MetricRow[];
  dashboardUrl: string;
};

function formatValue(value: number, format: MetricRow["format"]): string {
  switch (format) {
    case "percent":
      return `${(value * 100).toFixed(1)}%`;
    case "currency":
      return `$${(value / 100).toFixed(2)}`;
    default:
      return String(value);
  }
}

function renderMetricRow(metric: MetricRow): string {
  const formatted = formatValue(metric.value, metric.format);

  return `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid ${emailBrand.borderColor}; color: ${emailBrand.foregroundColor}; font-size: 14px; line-height: 20px;">
        ${escapeHtml(metric.label)}
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid ${emailBrand.borderColor}; color: ${emailBrand.foregroundColor}; font-size: 14px; line-height: 20px; font-weight: 600; text-align: right;">
        ${escapeHtml(formatted)}
      </td>
    </tr>
  `;
}

export function renderAnalyticsScheduledReportEmail({
  businessName,
  periodLabel,
  periodStart,
  periodEnd,
  metrics,
  dashboardUrl,
}: AnalyticsScheduledReportTemplateInput) {
  const subject = `${periodLabel} analytics report for ${businessName}`;

  const metricsTable = `
    <div style="margin: 22px 0; border: 1px solid ${emailBrand.borderColor}; border-radius: 14px; background: ${emailBrand.cardColor}; overflow: hidden;">
      <div style="padding: 14px 16px; border-bottom: 1px solid ${emailBrand.borderColor}; background: ${emailBrand.accentColor};">
        <p style="margin: 0; color: ${emailBrand.foregroundColor}; font-size: 13px; line-height: 18px; font-weight: 700;">${escapeHtml(periodLabel)} analytics summary</p>
        <p style="margin: 4px 0 0; color: ${emailBrand.mutedTextColor}; font-size: 12px; line-height: 16px;">${escapeHtml(periodStart)} – ${escapeHtml(periodEnd)}</p>
      </div>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 16px; border-bottom: 1px solid ${emailBrand.borderColor}; color: ${emailBrand.mutedTextColor}; font-size: 12px; line-height: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Metric</td>
          <td style="padding: 10px 16px; border-bottom: 1px solid ${emailBrand.borderColor}; color: ${emailBrand.mutedTextColor}; font-size: 12px; line-height: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; text-align: right;">Value</td>
        </tr>
        ${metrics.map(renderMetricRow).join("")}
      </table>
    </div>
  `;

  const html = renderEmailLayout({
    label: "Analytics",
    title: `${periodLabel} report`,
    preheader: `${businessName} analytics for ${periodStart} – ${periodEnd}`,
    footerContext: businessName,
    cta: {
      href: dashboardUrl,
      label: "View full dashboard",
    },
    children: `
      <p style="margin: 0; color: ${emailBrand.foregroundColor}; font-size: 15px; line-height: 24px;">Here's the ${escapeHtml(periodLabel.toLowerCase())} analytics summary for ${escapeHtml(businessName)}.</p>
      ${metricsTable}
    `,
  });

  const text = [
    `${periodLabel} analytics report for ${businessName}`,
    `${periodStart} – ${periodEnd}`,
    "",
    ...metrics.map((m) => `${m.label}: ${formatValue(m.value, m.format)}`),
    "",
    `View dashboard: ${dashboardUrl}`,
  ].join("\n");

  return { subject, html, text };
}
