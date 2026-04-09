"use client";

import * as React from "react";
import Link from "next/link";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type TruncatedTextWithTooltipProps = {
  text: string;
  className?: string;
  href?: string;
  prefetch?: boolean;
};

export function TruncatedTextWithTooltip({
  text,
  className,
  href,
  prefetch = true,
}: TruncatedTextWithTooltipProps) {
  const [mounted, setMounted] = React.useState(false);
  const [isTruncated, setIsTruncated] = React.useState(false);
  const contentRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) {
      return;
    }

    const node = contentRef.current;

    if (!node) {
      return;
    }

    const updateTruncation = () => {
      setIsTruncated(node.scrollWidth > node.clientWidth + 1);
    };

    updateTruncation();

    const frame = window.requestAnimationFrame(updateTruncation);
    const fontSet = document.fonts;

    const handleFontLoadingDone = () => {
      updateTruncation();
    };

    void fontSet.ready.then(() => {
      updateTruncation();
    });

    fontSet.addEventListener("loadingdone", handleFontLoadingDone);

    if (typeof ResizeObserver === "undefined") {
      return () => {
        window.cancelAnimationFrame(frame);
        fontSet.removeEventListener("loadingdone", handleFontLoadingDone);
      };
    }

    const observer = new ResizeObserver(updateTruncation);
    observer.observe(node);

    return () => {
      window.cancelAnimationFrame(frame);
      fontSet.removeEventListener("loadingdone", handleFontLoadingDone);
      observer.disconnect();
    };
  }, [mounted, text]);

  const content = href ? (
    <Link
      className={cn("block max-w-full truncate", className)}
      href={href}
      prefetch={prefetch}
      ref={(node) => {
        contentRef.current = node;
      }}
    >
      {text}
    </Link>
  ) : (
    <span
      className={cn("block max-w-full truncate", className)}
      ref={(node) => {
        contentRef.current = node;
      }}
    >
      {text}
    </span>
  );

  if (!mounted || !isTruncated) {
    return content;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent
        align="start"
        className="max-w-sm break-words"
        side="top"
        sideOffset={6}
      >
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
