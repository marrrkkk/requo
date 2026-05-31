import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { MarketingHeaderShell } from "@/components/marketing/marketing-header-shell";
import { Button } from "@/components/ui/button";
import { SheetClose } from "@/components/ui/sheet";
import { dashboardPath } from "@/features/businesses/routes";
import { getOptionalSession } from "@/lib/auth/session";

/**
 * Marketing site header. The floating nav shell renders immediately; the
 * auth-aware CTA clusters stream in through Suspense so session lookups never
 * block the brand or navigation paint.
 */
export function MarketingHeader() {
  return (
    <MarketingHeaderShell
      actions={
        <Suspense fallback={<DesktopActionsFallback />}>
          <DesktopActions />
        </Suspense>
      }
      mobileActions={
        <Suspense fallback={<MobileActionsFallback />}>
          <MobileActions />
        </Suspense>
      }
    />
  );
}

async function DesktopActions() {
  const session = await getOptionalSession();

  if (session?.user) {
    return (
      <Button asChild size="sm">
        <Link href={dashboardPath}>
          Dashboard
          <ArrowRight data-icon="inline-end" />
        </Link>
      </Button>
    );
  }

  return (
    <>
      <Button asChild size="sm" variant="ghost">
        <Link href="/login">Log in</Link>
      </Button>
      <Button asChild size="sm">
        <Link href="/signup">
          Start free
          <ArrowRight data-icon="inline-end" />
        </Link>
      </Button>
    </>
  );
}

function DesktopActionsFallback() {
  return (
    <>
      <div className="h-9 w-16 rounded-md bg-muted/40" />
      <div className="h-9 w-24 rounded-md bg-muted/40" />
    </>
  );
}

async function MobileActions() {
  const session = await getOptionalSession();

  if (session?.user) {
    return (
      <SheetClose asChild>
        <Button asChild className="w-full" size="lg">
          <Link href={dashboardPath}>
            Go to dashboard
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </SheetClose>
    );
  }

  return (
    <>
      <SheetClose asChild>
        <Button asChild className="w-full" size="lg" variant="outline">
          <Link href="/login">Log in</Link>
        </Button>
      </SheetClose>
      <SheetClose asChild>
        <Button asChild className="w-full" size="lg">
          <Link href="/signup">
            Start free
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </SheetClose>
    </>
  );
}

function MobileActionsFallback() {
  return (
    <>
      <div className="h-11 w-full rounded-md bg-muted/40" />
      <div className="h-11 w-full rounded-md bg-muted/40" />
    </>
  );
}
