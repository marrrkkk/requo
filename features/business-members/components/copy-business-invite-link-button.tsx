"use client";

import { startTransition, useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";

type CopyBusinessInviteLinkButtonProps = {
  inviteUrl: string;
};

export function CopyBusinessInviteLinkButton({
  inviteUrl,
}: CopyBusinessInviteLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);

      startTransition(() => {
        setCopied(true);
      });

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch (error) {
      console.error("Failed to copy business invite URL.", error);
    }
  }

  return (
    <Button onClick={handleCopy} type="button" variant="outline">
      {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
      {copied ? "Copied link" : "Copy invite link"}
    </Button>
  );
}
