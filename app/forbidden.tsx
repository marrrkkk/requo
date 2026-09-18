import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Root `forbidden` boundary, rendered when `forbidden()` is thrown.
 *
 * This file mirrors `app/not-found.tsx` — same markup, same classes, same
 * button — with copy and numeral updated for HTTP 403 Forbidden. Keep them in
 * step: if the status page styling changes, change this too.
 *
 * Placement is load-bearing. `forbidden()` is thrown by `requireAdminUser()`,
 * which `app/admin/layout.tsx` calls from its Suspense-wrapped slots — and a
 * throw from a *layout* is resolved by the nearest boundary **above** that
 * layout. `app/admin/error.tsx` only wraps `children`, which is exactly why the
 * original crash skipped it and landed in `app/global-error.tsx`. The same rule
 * applies here, so this file has to sit at the root.
 *
 * This is the secondary path, not the primary one: `proxy.ts` answers a
 * non-admin with a real `403` before anything renders. Reaching this file means
 * the request got past the proxy's optimistic cookie check and was then refused
 * by the database re-check in `requireAdminUser()`. It renders with a `200`
 * status — the shell has already streamed by this point — which is the trade-off
 * Next documents for `forbidden()` under Cache Components.
 */
export default function Forbidden() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-6 py-20">
      <div className="flex flex-col items-center text-center">
        <p className="select-none font-heading text-[10rem] font-black leading-none tracking-tighter text-foreground/[0.06] sm:text-[16rem] md:text-[20rem]">
          403
        </p>

        <div className="-mt-12 flex flex-col items-center gap-4 sm:-mt-16 md:-mt-20">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Access forbidden
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            You don&apos;t have permission to access this page.
          </p>
        </div>

        <div className="mt-8">
          <Button asChild size="lg">
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
