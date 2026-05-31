"use client";

import { startTransition, useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";

type CopyQuoteLinkButtonProps = {
  url: string;
};

export function CopyQuoteLinkButton({ url }: CopyQuoteLinkButtonProps) {
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
    <Button onClick={handleCopy} size="sm" type="button" variant="ghost">
      {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}
