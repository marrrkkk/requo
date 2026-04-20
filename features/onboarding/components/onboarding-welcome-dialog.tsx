"use client";

import { useEffect, useState } from "react";

import { Check, Copy, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const welcomeStorageKeyPrefix = "requo-welcome-";

type OnboardingWelcomeDialogProps = {
  businessName: string;
  businessSlug: string;
  publicInquiryUrl: string;
};

export function OnboardingWelcomeDialog({
  businessName,
  businessSlug,
  publicInquiryUrl,
}: OnboardingWelcomeDialogProps) {
  const storageKey = `${welcomeStorageKeyPrefix}${businessSlug}`;
  const [open, setOpen] = useState(() => {
    try {
      return !localStorage.getItem(storageKey);
    } catch {
      return false;
    }
  });
  const [copied, setCopied] = useState(false);
  const fullUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${publicInquiryUrl}`
      : publicInquiryUrl;

  useEffect(() => {
    if (open) {
      try {
        localStorage.setItem(storageKey, "1");
      } catch {
        // localStorage may be unavailable
      }
    }
  }, [open, storageKey]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may be unavailable
    }
  }

  if (!open) {
    return null;
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Your inquiry form is live</DialogTitle>
          <DialogDescription>
            <strong>{businessName}</strong> is ready to receive inquiries. Share
            the link with customers or add it to your website.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-4">
          <div className="soft-panel flex items-center gap-3 overflow-hidden rounded-lg px-4 py-3">
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {fullUrl}
            </p>
            <Button
              className="shrink-0"
              onClick={handleCopy}
              size="sm"
              type="button"
              variant="ghost"
            >
              {copied ? (
                <>
                  <Check className="size-3.5" data-icon="inline-start" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-3.5" data-icon="inline-start" />
                  Copy link
                </>
              )}
            </Button>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button onClick={() => setOpen(false)} type="button" variant="outline">
            Got it
          </Button>
          <Button asChild type="button">
            <a href={publicInquiryUrl} rel="noreferrer" target="_blank">
              Go to your form
              <ExternalLink className="size-3.5" data-icon="inline-end" />
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
