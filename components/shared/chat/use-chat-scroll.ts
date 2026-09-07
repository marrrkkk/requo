"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Shared scroll-following for both conversational surfaces.
 *
 * The transcript is the one thing that scrolls. The view follows new output
 * only while the reader is already at the bottom (within roughly 64px).
 * Scrolling up detaches immediately; returning to the bottom re-attaches.
 *
 * - Instant during streaming (animating per token makes text unreadable).
 * - Smooth on the reader's own send (acknowledges the send deliberately).
 * - A detached affordance ("Jump to latest") appears only while detached.
 */

const STICK_THRESHOLD_PX = 64;

export function useChatScroll<T>({
  contentKey,
  streaming,
}: {
  /** Changes whenever transcript content grows (turns + status line). */
  contentKey: T;
  /** True while a turn streams — follow instantly, never animated. */
  streaming: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [detached, setDetached] = useState(false);
  const detachedRef = useRef(false);

  const isNearBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return true;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distance <= STICK_THRESHOLD_PX;
  }, []);

  const scrollToBottom = useCallback((smooth: boolean) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  const jumpToLatest = useCallback(() => {
    scrollToBottom(true);
    // Re-attach immediately so the pill clears without waiting for the
    // smooth scroll to settle.
    detachedRef.current = false;
    setDetached(false);
  }, [scrollToBottom]);

  // Track detach/attach from the reader's own scrolling.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      const near = isNearBottom();
      const nextDetached = !near;
      if (nextDetached !== detachedRef.current) {
        detachedRef.current = nextDetached;
        setDetached(nextDetached);
      }
    };

    // Start attached at the bottom.
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [isNearBottom]);

  // Follow new output only while attached. Instant while streaming so a
  // streaming reply stays in view without animating on every token.
  useEffect(() => {
    if (detachedRef.current) return;
    scrollToBottom(false);
  }, [contentKey, scrollToBottom]);

  // Keep the bottom in view when streaming starts while attached.
  useEffect(() => {
    if (!streaming) return;
    if (detachedRef.current) return;
    scrollToBottom(false);
  }, [streaming, scrollToBottom]);

  return {
    containerRef,
    /** True while the reader is reading history (pill visible). */
    detached,
    /** Smooth, deliberate — call after the reader's own send. */
    scrollToLatestSmooth: () => scrollToBottom(true),
    jumpToLatest,
  };
}
