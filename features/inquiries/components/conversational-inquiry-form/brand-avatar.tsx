"use client";

import Image from "next/image";
import type { PublicInquiryBusiness } from "@/features/inquiries/types";

/* -------------------------------------------------------------------------- */
/*  Brand avatar (business logo for the AI header)                             */
/* -------------------------------------------------------------------------- */

export function BrandAvatar({ business }: { business: PublicInquiryBusiness }) {
  if (business.logoUrl) {
    return (
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-background/92 shadow-sm sm:size-11">
        <Image
          src={business.logoUrl}
          alt={`${business.name} logo`}
          width={44}
          height={44}
          className="h-full w-full object-cover"
          unoptimized
        />
      </div>
    );
  }

  const initials = business.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-primary/10 text-primary sm:size-11">
      <span className="text-xs font-semibold tracking-wide">{initials}</span>
    </div>
  );
}
