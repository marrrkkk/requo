"use client";

import { startTransition, useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { mobileNavbarIconButtonClassName } from "@/components/shell/mobile-header-slot";
import { cn } from "@/lib/utils";

type CopyQuoteLinkButtonProps = {
  url: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  /**
   * Collapse to an icon-only navbar button below `lg` (list-page header
   * treatment). Only set for header instances portaled via
   * `MobileHeaderSlot` — body instances keep their full label.
   */
  compactOnMobile?: boolean;
};

export function CopyQuoteLinkButton({
  url,
  variant = "ghost",
  size = "sm",
  compactOnMobile = false,
}: CopyQuoteLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);

      startTransition(() => {
        setCopied(true);
      });

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch (error) {
      console.error("Failed to copy public quote URL.", error);
    }
  }

  return (
    <Button
      onClick={handleCopy}
      size={size}
      type="button"
      variant={variant}
      className={compactOnMobile ? cn(mobileNavbarIconButtonClassName) : undefined}
      aria-label={compactOnMobile ? (copied ? "Copied" : "Copy link") : undefined}
      title={compactOnMobile ? "Copy link" : undefined}
    >
      {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
      {compactOnMobile ? (
        <span className="hidden lg:inline">{copied ? "Copied" : "Copy link"}</span>
      ) : copied ? (
        "Copied"
      ) : (
        "Copy link"
      )}
    </Button>
  );
}
