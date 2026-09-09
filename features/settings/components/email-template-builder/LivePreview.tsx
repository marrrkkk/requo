"use client";

import { useMemo } from "react";

import {
  quoteEmailSampleMergeValues,
  replaceMergeTags,
  getDefaultContentForBlockType,
  type EmailTemplateBlock,
} from "@/features/settings/email-templates";
import { cn } from "@/lib/utils";

const SAMPLE_ITEMS = [
  { description: "Kitchen cabinet refacing", quantity: 1, unit: "$1,800.00", total: "$1,800.00" },
  { description: "Quartz countertop install", quantity: 1, unit: "$700.00", total: "$700.00" },
];

function previewTextColor(color: unknown): string {
  if (color === "muted") return "var(--muted-foreground)";
  if (typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color)) return color;
  return "var(--foreground)";
}

function previewFontSize(size: unknown): string {
  if (size === "sm") return "0.8125rem";
  if (size === "lg") return "1.0625rem";
  return "0.9375rem";
}

function previewAlign(align: unknown): "left" | "center" | "right" {
  if (align === "center" || align === "right") return align;
  return "left";
}

function previewSpacing(spacing: unknown): string {
  if (spacing === "compact") return "0.5rem";
  if (spacing === "spacious") return "1.5rem";
  return "1rem";
}

function PreviewBlock({ block }: { block: EmailTemplateBlock }) {
  const align = previewAlign(block.style?.align);
  const marginTop = previewSpacing(block.style?.spacing);

  if (block.type === "greeting" || block.type === "intro" || block.type === "text" || block.type === "closing") {
    const raw = block.content?.trim()
      ? block.content
      : getDefaultContentForBlockType(block.type);
    const resolved = replaceMergeTags(raw, quoteEmailSampleMergeValues);
    return (
      <p
        style={{
          marginTop,
          marginBottom: 0,
          color: previewTextColor(block.style?.textColor),
          fontSize: previewFontSize(block.style?.fontSize),
          lineHeight: 1.6,
          textAlign: align,
          whiteSpace: "pre-wrap",
        }}
      >
        {resolved}
      </p>
    );
  }

  if (block.type === "cta") {
    const raw = block.content?.trim()
      ? block.content
      : getDefaultContentForBlockType("cta");
    const label = replaceMergeTags(raw, quoteEmailSampleMergeValues);
    const bg =
      block.style?.buttonColor && /^#[0-9a-fA-F]{6}$/.test(block.style.buttonColor)
        ? block.style.buttonColor
        : "#008060";
    const fg =
      block.style?.buttonTextColor && /^#[0-9a-fA-F]{6}$/.test(block.style.buttonTextColor)
        ? block.style.buttonTextColor
        : "#f4fffb";
    return (
      <div style={{ marginTop, textAlign: align }}>
        <span
          style={{
            display: "inline-block",
            borderRadius: 10,
            background: bg,
            color: fg,
            fontSize: 13,
            fontWeight: 700,
            padding: "10px 16px",
          }}
        >
          {label}
        </span>
      </div>
    );
  }

  if (block.type === "summary") {
    return (
      <div
        className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3"
        style={{ marginTop }}
      >
        <p className="text-xs font-semibold text-foreground">Quote summary</p>
        <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
          <div className="flex justify-between gap-2">
            <dt>Reference</dt>
            <dd className="font-medium text-foreground">{quoteEmailSampleMergeValues.quoteNumber}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Customer</dt>
            <dd className="font-medium text-foreground">{quoteEmailSampleMergeValues.customerName}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Title</dt>
            <dd className="font-medium text-foreground">{quoteEmailSampleMergeValues.quoteTitle}</dd>
          </div>
        </dl>
      </div>
    );
  }

  if (block.type === "line-items") {
    return (
      <div
        className="overflow-hidden rounded-xl border border-border/60"
        style={{ marginTop }}
      >
        {SAMPLE_ITEMS.map((item) => (
          <div
            key={item.description}
            className="flex items-center justify-between gap-2 border-b border-border/50 px-4 py-2.5 text-xs last:border-0"
          >
            <span className="font-medium text-foreground">{item.description}</span>
            <span className="text-muted-foreground">{item.total}</span>
          </div>
        ))}
      </div>
    );
  }

  if (block.type === "totals") {
    return (
      <div
        className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3"
        style={{ marginTop }}
      >
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Subtotal</span>
          <span className="font-semibold text-foreground">$2,500.00</span>
        </div>
        <div className="mt-1.5 flex justify-between border-t border-border/50 pt-2 text-sm">
          <span className="font-bold text-foreground">Total</span>
          <span className="font-bold text-foreground">$2,500.00</span>
        </div>
      </div>
    );
  }

  if (block.type === "notes") {
    return (
      <div
        className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground"
        style={{ marginTop }}
      >
        <p className="font-semibold text-foreground">Notes</p>
        <p className="mt-1">Includes materials and standard installation.</p>
      </div>
    );
  }

  if (block.type === "signature") {
    return (
      <p className="text-xs text-muted-foreground" style={{ marginTop }}>
        Thanks,
        <br />
        {quoteEmailSampleMergeValues.businessName}
      </p>
    );
  }

  if (block.type === "divider") {
    return <hr className="border-border/60" style={{ marginTop }} />;
  }

  return (
    <div
      style={{
        height:
          block.style?.spacing === "compact"
            ? 8
            : block.style?.spacing === "spacious"
              ? 32
              : 18,
        marginTop: 0,
      }}
      aria-hidden="true"
    />
  );
}

export function LivePreview({
  subject,
  blocks,
}: {
  subject: string;
  blocks: EmailTemplateBlock[];
}) {
  const resolvedSubject = useMemo(
    () => replaceMergeTags(subject || "", quoteEmailSampleMergeValues),
    [subject],
  );
  const visibleBlocks = useMemo(
    () => blocks.filter((block) => block.visible !== false),
    [blocks],
  );

  return (
    <section
      aria-label="Live preview"
      className="section-panel lg:sticky lg:top-24 lg:self-start"
    >
      <div className="mb-4">
        <p className="text-sm font-medium text-foreground">Live preview</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Sample data. Preview is approximate. Email clients may render some
          styles differently.
        </p>
      </div>
      <div className="rounded-xl border border-border/60 bg-background px-5 py-5">
        <div className="space-y-1.5 pb-4">
          <p className="meta-label">Subject</p>
          <p className="text-sm font-medium text-foreground">{resolvedSubject}</p>
        </div>
        <hr className="border-border/50" />
        <div className={cn("pt-2 text-sm text-foreground")}>
          {visibleBlocks.length ? (
            visibleBlocks.map((block) => <PreviewBlock key={block.id} block={block} />)
          ) : (
            <p className="pt-2 text-xs text-muted-foreground">
              All blocks are hidden. Show at least one block to preview the email.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
