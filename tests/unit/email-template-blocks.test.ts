import { describe, expect, it } from "vitest";

import { renderInvoiceEmail } from "@/emails/templates/invoice-email";
import { renderQuoteEmail } from "@/emails/templates/quote-email";
import { renderQuoteFollowUpEmail } from "@/emails/templates/quote-follow-up-email";
import {
  defaultEmailBlocks,
  defaultInvoiceEmailTemplate,
  defaultQuoteEmailTemplate,
  defaultQuoteFollowUpTemplate,
  MAX_EMAIL_TEMPLATE_BLOCKS,
  migrateLegacyConfigToBlocks,
  normalizeInvoiceEmailTemplate,
  normalizeQuoteEmailTemplate,
  normalizeQuoteFollowUpTemplate,
  replaceInvoiceMergeTags,
  replaceMergeTags,
  invoiceEmailSampleMergeValues,
  quoteEmailSampleMergeValues,
} from "@/features/settings/email-templates";
import {
  businessEmailTemplateSettingsSchema,
  businessInvoiceEmailTemplateSettingsSchema,
  businessQuoteFollowUpTemplateSettingsSchema,
} from "@/features/settings/schemas";

function baseQuoteInput(overrides: Record<string, unknown> = {}) {
  return {
    businessName: "Northline Home Services",
    customerName: "Alex Rivera",
    quoteNumber: "Q-2026-0042",
    title: "Kitchen renovation",
    publicQuoteUrl: "https://test.requo.app/quote/q_1",
    currency: "USD",
    validUntil: "2026-06-15",
    subtotalInCents: 250000,
    discountInCents: 0,
    totalInCents: 250000,
    notes: "Includes materials.",
    emailSignature: "Thanks,\nNorthline",
    items: [
      {
        description: "Cabinet refacing",
        quantity: 1,
        unitPriceInCents: 250000,
        lineTotalInCents: 250000,
      },
    ],
    ...overrides,
  };
}

describe("email template V2 migration", () => {
  it("normalizes null to defaults", () => {
    const normalized = normalizeQuoteEmailTemplate(null);
    expect(normalized.version).toBe(2);
    expect(normalized.blocks.map((block) => block.type)).toEqual([
      "greeting",
      "intro",
      "summary",
      "line-items",
      "totals",
      "cta",
      "notes",
      "signature",
      "closing",
    ]);
  });

  it("migrates V1 content verbatim", () => {
    const migrated = migrateLegacyConfigToBlocks({
      subject: "Custom subject",
      greeting: "Dear {{customerName}},",
      introText: "Custom intro",
      ctaLabel: "Open quote",
      closingText: "Custom closing",
    });
    expect(migrated.subject).toBe("Custom subject");
    const byType = new Map(migrated.blocks.map((block) => [block.type, block]));
    expect(byType.get("greeting")?.content).toBe("Dear {{customerName}},");
    expect(byType.get("intro")?.content).toBe("Custom intro");
    expect(byType.get("cta")?.content).toBe("Open quote");
    expect(byType.get("closing")?.content).toBe("Custom closing");
  });

  it("normalizes V1 stored shapes through the canonical function", () => {
    const normalized = normalizeQuoteEmailTemplate({
      greeting: "Hi {{customerName}},",
    });
    expect(normalized.version).toBe(2);
    expect(normalized.blocks.find((block) => block.type === "cta")).toBeDefined();
  });

  it("repairs V2 configs missing singletons and a hidden CTA", () => {
    const normalized = normalizeQuoteEmailTemplate({
      version: 2,
      subject: "Hello",
      blocks: [
        { id: "greeting", type: "greeting", content: "Hi", visible: true },
        { id: "cta", type: "cta", content: "View", visible: false },
      ],
    });
    const types = normalized.blocks.map((block) => block.type);
    for (const required of defaultEmailBlocks().map((block) => block.type)) {
      expect(types).toContain(required);
    }
    expect(normalized.blocks.find((block) => block.type === "cta")?.visible).toBe(true);
  });

  it("drops unknown blocks and dedupes singletons", () => {
    const normalized = normalizeQuoteEmailTemplate({
      version: 2,
      subject: "Hello",
      blocks: [
        { id: "a", type: "greeting", content: "One", visible: true },
        { id: "b", type: "greeting", content: "Two", visible: true },
        { id: "c", type: "nope" },
      ],
    } as unknown as Parameters<typeof normalizeQuoteEmailTemplate>[0]);
    expect(
      normalized.blocks.filter((block) => block.type === "greeting"),
    ).toHaveLength(1);
  });
});

describe("email template V2 validation", () => {
  function validInput() {
    const defaults = defaultQuoteEmailTemplate();
    return { subject: defaults.subject, blocks: defaults.blocks };
  }

  it("accepts the default template", () => {
    expect(
      businessEmailTemplateSettingsSchema.safeParse(validInput()).success,
    ).toBe(true);
  });

  it("rejects duplicate singletons and duplicate CTAs", () => {
    const input = validInput();
    const greeting = input.blocks.find((block) => block.type === "greeting");
    const result = businessEmailTemplateSettingsSchema.safeParse({
      ...input,
      blocks: [...input.blocks, { ...greeting, id: "greeting_2" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing or hidden CTA", () => {
    const input = validInput();
    const withoutCta = {
      ...input,
      blocks: input.blocks.filter((block) => block.type !== "cta"),
    };
    expect(
      businessEmailTemplateSettingsSchema.safeParse(withoutCta).success,
    ).toBe(false);

    const hiddenCta = {
      ...input,
      blocks: input.blocks.map((block) =>
        block.type === "cta" ? { ...block, visible: false } : block,
      ),
    };
    expect(
      businessEmailTemplateSettingsSchema.safeParse(hiddenCta).success,
    ).toBe(false);
  });

  it("rejects invalid types, styles, and oversized templates", () => {
    const input = validInput();
    expect(
      businessEmailTemplateSettingsSchema.safeParse({
        ...input,
        blocks: [{ id: "x", type: "hero", visible: true }],
      }).success,
    ).toBe(false);

    expect(
      businessEmailTemplateSettingsSchema.safeParse({
        ...input,
        blocks: input.blocks.map((block) =>
          block.type === "cta"
            ? { ...block, style: { buttonColor: "red" } }
            : block,
        ),
      }).success,
    ).toBe(false);

    const many = Array.from({ length: MAX_EMAIL_TEMPLATE_BLOCKS + 1 }, (_, i) => ({
      id: `txt_${i}`,
      type: "text",
      content: "hi",
      visible: true,
    }));
    expect(
      businessEmailTemplateSettingsSchema.safeParse({
        subject: "Hi",
        blocks: many,
      }).success,
    ).toBe(false);
  });
});

describe("email template V2 rendering", () => {
  it("respects block order in HTML and text", () => {
    const template = defaultQuoteEmailTemplate();
    const greeting = template.blocks.find((block) => block.type === "greeting");
    const reordered = {
      ...template,
      blocks: [
        ...template.blocks.filter((block) => block.type !== "greeting"),
        { ...greeting! },
      ],
    };

    const rendered = renderQuoteEmail(baseQuoteInput({ templateOverrides: reordered }));
    const greetingPos = rendered.html.indexOf("Hi Alex Rivera");
    const closingPos = rendered.html.indexOf("Reply to this email");
    expect(greetingPos).toBeGreaterThan(-1);
    expect(closingPos).toBeGreaterThan(-1);
    expect(greetingPos).toBeGreaterThan(closingPos);

    const textGreeting = rendered.text.indexOf("Hi Alex Rivera");
    const textClosing = rendered.text.indexOf("Reply to this email");
    expect(textGreeting).toBeGreaterThan(textClosing);
  });

  it("skips hidden blocks and resolves merge tags", () => {
    const template = defaultQuoteEmailTemplate();
    const rendered = renderQuoteEmail(
      baseQuoteInput({
        templateOverrides: {
          ...template,
          blocks: template.blocks.map((block) =>
            block.type === "intro" ? { ...block, visible: false } : block,
          ),
        },
      }),
    );
    expect(rendered.html).not.toContain("prepared a quote for you");
    expect(rendered.html).toContain("Hi Alex Rivera");
    expect(
      replaceMergeTags("Hi {{customerName}}", quoteEmailSampleMergeValues),
    ).toBe("Hi Alex Rivera");
  });

  it("escapes untrusted content and applies CTA colors", () => {
    const template = defaultQuoteEmailTemplate();
    const rendered = renderQuoteEmail(
      baseQuoteInput({
        customerName: "<b>Ava</b>",
        templateOverrides: {
          ...template,
          blocks: template.blocks.map((block) =>
            block.type === "cta"
              ? {
                   ...block,
                   content: "View <quote>",
                   style: { buttonColor: "#123456", buttonTextColor: "#ffffff" },
                 }
              : block,
          ),
        },
      }),
    );
    expect(rendered.html).not.toContain("<b>Ava</b>");
    expect(rendered.html).toContain("&lt;b&gt;Ava&lt;/b&gt;");
    expect(rendered.html).toContain("#123456");
    expect(rendered.html).toContain("View &lt;quote&gt;");
  });
});

describe("invoice + follow-up templates", () => {
  function baseInvoiceInput(overrides: Record<string, unknown> = {}) {
    return {
      businessName: "Northline Home Services",
      customerName: "Alex Rivera",
      invoiceNumber: "INV-2026-0018",
      title: "Kitchen renovation — final invoice",
      currency: "USD",
      issueDate: "2026-06-16",
      dueDate: "2026-06-30",
      subtotalInCents: 250000,
      discountInCents: 0,
      totalInCents: 250000,
      balanceInCents: 125000,
      notes: "Includes materials.",
      paymentTerms: "Due within 14 days.",
      emailSignature: "Thanks,\nNorthline",
      items: [
        {
          description: "Cabinet refacing",
          quantity: 1,
          unitPriceInCents: 250000,
          lineTotalInCents: 250000,
        },
      ],
      ...overrides,
    };
  }

  it("normalizes null to per-kind defaults", () => {
    const invoice = normalizeInvoiceEmailTemplate(null);
    expect(invoice.blocks.map((block) => block.type)).toContain("payment-terms");
    expect(invoice.blocks.some((block) => block.type === "cta")).toBe(false);
    expect(invoice.subject).toContain("{{invoiceNumber}}");

    const followUp = normalizeQuoteFollowUpTemplate(null);
    expect(followUp.blocks.map((block) => block.type)).toEqual([
      "greeting",
      "intro",
      "cta",
      "signature",
      "closing",
    ]);
    expect(
      followUp.blocks.find((block) => block.type === "cta")?.visible,
    ).toBe(true);
  });

  it("drops forbidden blocks per kind", () => {
    const invoice = normalizeInvoiceEmailTemplate({
      version: 2,
      subject: "Hi",
      blocks: [
        { id: "greeting", type: "greeting", content: "Hi", visible: true },
        { id: "cta", type: "cta", content: "Reply", visible: true },
      ],
    });
    expect(invoice.blocks.some((block) => block.type === "cta")).toBe(true);

    const followUp = normalizeQuoteFollowUpTemplate({
      version: 2,
      subject: "Hi",
      blocks: [
        { id: "greeting", type: "greeting", content: "Hi", visible: true },
        { id: "summary", type: "summary", visible: true },
        { id: "cta", type: "cta", content: "View", visible: true },
      ],
    });
    expect(followUp.blocks.some((block) => block.type === "summary")).toBe(false);
    expect(followUp.blocks.some((block) => block.type === "cta")).toBe(true);
  });

  it("validates per-kind CTA rules", () => {
    const invoiceDefaults = defaultInvoiceEmailTemplate();
    expect(
      businessInvoiceEmailTemplateSettingsSchema.safeParse({
        subject: invoiceDefaults.subject,
        blocks: invoiceDefaults.blocks,
      }).success,
    ).toBe(true);

    const followUpDefaults = defaultQuoteFollowUpTemplate();
    expect(
      businessQuoteFollowUpTemplateSettingsSchema.safeParse({
        subject: followUpDefaults.subject,
        blocks: followUpDefaults.blocks,
      }).success,
    ).toBe(true);

    // Quote rejects payment-terms.
    const quoteWithTerms = {
      subject: defaultQuoteEmailTemplate().subject,
      blocks: [
        ...defaultQuoteEmailTemplate().blocks,
        { id: "pt_1", type: "payment-terms", visible: true },
      ],
    };
    expect(
      businessEmailTemplateSettingsSchema.safeParse(quoteWithTerms).success,
    ).toBe(false);

    // Follow-up rejects summary tables.
    expect(
      businessQuoteFollowUpTemplateSettingsSchema.safeParse({
        subject: followUpDefaults.subject,
        blocks: [
          ...followUpDefaults.blocks,
          { id: "summary", type: "summary", visible: true },
        ],
      }).success,
    ).toBe(false);
  });

  it("renders invoice blocks with merge tags + balance", () => {
    const rendered = renderInvoiceEmail(baseInvoiceInput({}));
    expect(rendered.subject).toContain("INV-2026-0018");
    expect(rendered.html).toContain("Invoice summary");
    expect(rendered.html).toContain("Balance due");
    expect(rendered.html).toContain("Payment terms");
    expect(
      replaceInvoiceMergeTags(
        "Due {{dueDate}} — {{balanceDue}}",
        invoiceEmailSampleMergeValues,
      ),
    ).toContain("Jun 30, 2026");
  });

  it("renders follow-up with attempt-aware subjects", () => {
    const base = {
      businessName: "Northline Home Services",
      customerName: "Alex Rivera",
      quoteNumber: "Q-2026-0042",
      title: "Kitchen renovation",
      publicQuoteUrl: "https://test.requo.app/quote/q_1",
      emailSignature: "Thanks,\nNorthline",
    };
    const first = renderQuoteFollowUpEmail({ ...base, attemptNumber: 1 });
    const second = renderQuoteFollowUpEmail({ ...base, attemptNumber: 2 });
    expect(first.subject).toContain("Following up");
    expect(second.subject).toContain("Checking in");
    expect(first.html).toContain("View quote");
    expect(second.html).toContain("View quote");
  });
});
