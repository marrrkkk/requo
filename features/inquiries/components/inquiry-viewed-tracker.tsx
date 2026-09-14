"use client";

import { useEffect, useRef } from "react";

import { useNavBadges } from "@/components/shell/nav-badge-context";
import { markInquiryViewedAction } from "@/features/inquiries/actions";
import { markInquiryViewedLocally } from "@/features/inquiries/components/inquiry-viewed-store";

type InquiryViewedTrackerProps = {
  inquiryId: string;
  /** True when the detail payload still shows `firstViewedAt == null`. */
  isUnreadInitially: boolean;
};

/**
 * Marks the open inquiry viewed after paint.
 *
 * Runs as a client effect (outside render) so the Server Action can safely
 * revalidate tags — calling it during SSR render throws
 * "used updateTag during render which is unsupported".
 *
 * Instant UX (with no list reload on Back):
 * - marks the id in the local viewed store synchronously so a back
 *   navigation hides the list dot/bold immediately, even before the server
 *   roundtrip finishes,
 * - decrements the sidebar nav badge only once the server confirms this
 *   open was the first view (`marked: true`). The detail payload can be
 *   stale (still `firstViewedAt == null` after another tab already viewed
 *   it), so decrementing optimistically would double-count on revisits.
 * The action persists the viewed flag and revalidates the list/badge tags
 * stale-while-revalidate, so Back keeps serving the instant router-cache
 * payload — no skeleton, already read — while reloads and other sessions
 * converge in the background.
 */
export function InquiryViewedTracker({
  inquiryId,
  isUnreadInitially,
}: InquiryViewedTrackerProps) {
  const { inquiryUnreadCount, setInquiryUnreadCount } = useNavBadges();
  const firedForRef = useRef<string | null>(null);
  // Latest badge value for the async action callback — the view effect
  // below fires once per inquiry and must not re-run when the badge
  // streams in, so the count is mirrored here instead of read in deps.
  const unreadCountRef = useRef<number | null>(null);

  useEffect(() => {
    unreadCountRef.current = inquiryUnreadCount;
  }, [inquiryUnreadCount]);

  useEffect(() => {
    if (!isUnreadInitially || firedForRef.current === inquiryId) {
      return;
    }

    firedForRef.current = inquiryId;

    markInquiryViewedLocally(inquiryId);

    void markInquiryViewedAction(inquiryId)
      .then(({ marked }) => {
        if (!marked) {
          return;
        }

        const current = unreadCountRef.current;

        if (typeof current === "number" && current > 0) {
          setInquiryUnreadCount(current - 1);
        }
      })
      .catch(() => {
        // Best-effort read receipt — the detail itself already rendered.
      });
  }, [inquiryId, isUnreadInitially, setInquiryUnreadCount]);

  return null;
}
