"use client";

import { useState } from "react";

import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type CopyPublicInquiryLinkButtonProps = {
  url: string;
};

export function CopyPublicInquiryLinkButton({
  url,
}: CopyPublicInquiryLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard.");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy public inquiry link.", error);
      toast.error("Failed to copy link.");
    }
  }

  return (
    <Button onClick={handleCopy} type="button" variant="outline">
      {copied ? (
        <>
          <Check data-icon="inline-start" />
          Copied link
        </>
      ) : (
        <>
          <Copy data-icon="inline-start" />
          Copy public link
        </>
      )}
    </Button>
  );
}
