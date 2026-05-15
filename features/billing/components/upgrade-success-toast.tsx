"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Reads the `upgrade=success` query flag (set by the post-checkout
 * server-side redirect) and fires a one-off toast confirming the
 * upgrade landed. Strips the flag from the URL afterwards so the
 * toast can't replay on refresh or back-navigation.
 *
 * Intentionally lightweight: the user's effective plan is the
 * source of truth, so this is just feedback. Mounted on the pages
 * users return to after checkout (businesses hub + business shell).
 */
export function UpgradeSuccessToast() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (searchParams.get("upgrade") !== "success") return;

    firedRef.current = true;

    toast.success(
      "Your subscription is being activated — paid features will appear in a moment.",
    );

    // Strip the flag so refreshes don't re-toast.
    const next = new URLSearchParams(searchParams.toString());
    next.delete("upgrade");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [pathname, router, searchParams]);

  return null;
}
