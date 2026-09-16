"use client";

import { useCallback, useRef, useState } from "react";

const MIN_HEIGHT = 160;
const MAX_HEIGHT = 1200;
const FALLBACK_HEIGHT = 320;

type EmailHtmlPreviewProps = {
  html: string;
  title: string;
};

/**
 * Auto-height preview of stored email HTML.
 *
 * `sandbox="allow-same-origin"` without `allow-scripts` keeps scripts
 * inside the email disabled while letting the parent measure content
 * height — so a one-line email doesn't render as a tall white void. When
 * measurement fails the fallback height stands and the frame scrolls.
 */
export function EmailHtmlPreview({ html, title }: EmailHtmlPreviewProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(FALLBACK_HEIGHT);

  const resize = useCallback(() => {
    try {
      const next =
        frameRef.current?.contentDocument?.documentElement?.scrollHeight ??
        0;

      if (next > 0) {
        setHeight(Math.min(Math.max(Math.ceil(next), MIN_HEIGHT), MAX_HEIGHT));
      }
    } catch {
      // Opaque origin — keep the fallback height.
    }
  }, []);

  return (
    <iframe
      className="w-full rounded-lg border border-border/60 bg-white"
      onLoad={resize}
      ref={frameRef}
      sandbox="allow-same-origin"
      srcDoc={html}
      style={{ height }}
      title={title}
    />
  );
}
