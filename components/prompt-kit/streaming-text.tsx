"use client";

import { useEffect, useState, useRef } from "react";
import { Markdown } from "./markdown";

export type StreamingTextProps = {
  children: string;
  /**
   * Characters per second to display.
   * Default: 50 (roughly human reading speed)
   */
  speed?: number;
  /**
   * Minimum duration in milliseconds to animate, even if content is short.
   * Default: 300ms
   */
  minDuration?: number;
  /**
   * Called when animation completes
   */
  onComplete?: () => void;
  /**
   * If true, skip animation and show full text immediately
   */
  instant?: boolean;
};

/**
 * StreamingText component that animates text character-by-character at a
 * consistent speed, regardless of how fast the actual content arrives.
 *
 * This creates a smooth, predictable streaming effect even when responses
 * are instant.
 */
export function StreamingText({
  children,
  speed = 50,
  minDuration = 300,
  onComplete,
  instant = false,
}: StreamingTextProps) {
  const shouldAnimate = !instant && children.length > 0;
  const [displayedText, setDisplayedText] = useState(
    shouldAnimate ? "" : children
  );
  const [isComplete, setIsComplete] = useState(!shouldAnimate);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    // Skip animation if instant mode or no content
    if (!shouldAnimate) {
      return;
    }

    // Reset and start animation
    startTimeRef.current = performance.now();

    const totalChars = children.length;
    const charDelay = 1000 / speed;
    const naturalDuration = totalChars * charDelay;
    const duration = Math.max(naturalDuration, minDuration);

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const charsToShow = Math.floor(progress * totalChars);

      if (charsToShow < totalChars) {
        setDisplayedText(children.slice(0, charsToShow));
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayedText(children);
        setIsComplete(true);
        onComplete?.();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [children, speed, minDuration, shouldAnimate, onComplete]);

  return (
    <>
      {displayedText}
      {!isComplete && <span className="animate-pulse">▋</span>}
    </>
  );
}

export type StreamingMarkdownProps = {
  children: string;
  /**
   * Characters per second to display.
   * Default: 60
   */
  speed?: number;
  /**
   * Minimum duration in milliseconds to animate, even if content is short.
   * Default: 400ms
   */
  minDuration?: number;
  /**
   * Called when animation completes
   */
  onComplete?: () => void;
  /**
   * If true, skip animation and show full text immediately
   */
  instant?: boolean;
};

/**
 * StreamingMarkdown component that animates markdown text character-by-character
 * at a consistent speed, with proper markdown rendering.
 */
export function StreamingMarkdown({
  children,
  speed = 60,
  minDuration = 400,
  onComplete,
  instant = false,
}: StreamingMarkdownProps) {
  const shouldAnimate = !instant && children.length > 0;
  const [displayedText, setDisplayedText] = useState(
    shouldAnimate ? "" : children
  );
  const [isComplete, setIsComplete] = useState(!shouldAnimate);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    // Skip animation if instant mode or no content
    if (!shouldAnimate) {
      return;
    }

    // Reset and start animation
    startTimeRef.current = performance.now();

    const totalChars = children.length;
    const charDelay = 1000 / speed;
    const naturalDuration = totalChars * charDelay;
    const duration = Math.max(naturalDuration, minDuration);

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const charsToShow = Math.floor(progress * totalChars);

      if (charsToShow < totalChars) {
        setDisplayedText(children.slice(0, charsToShow));
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayedText(children);
        setIsComplete(true);
        onComplete?.();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [children, speed, minDuration, shouldAnimate, onComplete]);

  return (
    <>
      <Markdown>{displayedText}</Markdown>
      {!isComplete && <span className="animate-pulse ml-0.5">▋</span>}
    </>
  );
}
