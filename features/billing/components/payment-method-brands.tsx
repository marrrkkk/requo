"use client";

import { cn } from "@/lib/utils";

function BrandPill({
  className,
  label,
}: {
  className?: string;
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border/70 bg-background px-2 py-1 text-[0.7rem] font-medium tracking-tight text-foreground",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function QrPhBrandMark() {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex size-7 items-center justify-center rounded-md border border-border/70 bg-background text-[0.68rem] font-semibold tracking-[0.16em] text-foreground">
        QR
      </span>
      <span className="text-sm font-medium text-foreground">QR Ph</span>
    </div>
  );
}

export function CardAndMoreBrandMarks() {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <BrandPill label="Mastercard" />
      <BrandPill label="Visa" />
      <BrandPill label="PayPal" />
      <BrandPill label="Google Pay" />
    </div>
  );
}
