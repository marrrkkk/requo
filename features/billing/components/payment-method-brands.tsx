"use client";

import Image from "next/image";
import { Visa, Paypal, GooglePay, ApplePay } from "@thesvg/react";
import { cn } from "@/lib/utils";

function BrandIconPill({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <span
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center rounded-md border border-border/70 bg-background px-1.5 py-1",
        className,
      )}
      role="img"
    >
      {children}
    </span>
  );
}

export function CardAndMoreBrandMarks() {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <BrandIconPill label="Mastercard">
        <Image
          alt=""
          className="size-5 object-contain"
          height={20}
          src="/mastercard.svg"
          width={20}
        />
      </BrandIconPill>
      <BrandIconPill label="Visa">
        <Visa className="h-3.5 w-7" fill="currentColor" />
      </BrandIconPill>
      <BrandIconPill label="PayPal">
        <Paypal className="size-4" fill="currentColor" />
      </BrandIconPill>
      <BrandIconPill label="Google Pay">
        <GooglePay className="h-3.5 w-7" />
      </BrandIconPill>
      <BrandIconPill label="Apple Pay">
        <ApplePay className="h-3.5 w-7" fill="currentColor" />
      </BrandIconPill>
    </div>
  );
}
