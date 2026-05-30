"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

import {
  getMarketingNavHref,
  getMarketingNavKey,
  navItems,
  resourceLinks,
} from "@/components/marketing/marketing-data";
import { MarketingResourcesNav } from "@/components/marketing/marketing-resources-nav";
import { BrandMark } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/** Shared nav-link treatment for the floating marketing pill nav. */
export const marketingNavLinkClass =
  "relative inline-flex items-center rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=open]:text-foreground";

function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}

type MarketingHeaderShellProps = {
  /** Auth-aware CTA cluster for desktop (rendered as a Suspense slot). */
  actions: ReactNode;
  /** Auth-aware CTA cluster for the mobile sheet footer. */
  mobileActions: ReactNode;
};

export function MarketingHeaderShell({
  actions,
  mobileActions,
}: MarketingHeaderShellProps) {
  const [open, setOpen] = useState(false);
  const scrolled = useScrolled();

  return (
    <header className="pointer-events-none sticky top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4 lg:px-8">
      <div
        className={cn(
          "pointer-events-auto mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 rounded-2xl border pl-4 pr-2.5 transition-[background-color,border-color,box-shadow] duration-300 sm:h-16 sm:gap-4 sm:pl-5 sm:pr-3",
          scrolled
            ? "border-border/70 bg-background"
            : "border-transparent bg-transparent",
        )}
      >
        <BrandMark subtitle={null} size="lg" />

        <nav className="hidden items-center gap-0.5 lg:flex">
          {navItems.map((item) => (
            <Link
              className={marketingNavLinkClass}
              href={getMarketingNavHref(item)}
              key={getMarketingNavKey(item)}
            >
              {item.label}
            </Link>
          ))}
          <MarketingResourcesNav />
        </nav>

        <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-2.5">
          <div className="hidden items-center gap-2 sm:flex sm:gap-2.5">
            {actions}
          </div>

          <Sheet onOpenChange={setOpen} open={open}>
            <SheetTrigger asChild>
              <Button
                aria-label="Open navigation"
                className="lg:hidden"
                size="icon-sm"
                variant="ghost"
              >
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent
              className="w-[20rem] max-w-[calc(100vw-1.5rem)]"
              side="right"
            >
              <SheetHeader className="border-b border-border/70">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <BrandMark subtitle={null} size="lg" />
              </SheetHeader>

              <SheetBody className="gap-1">
                <nav className="flex flex-col gap-0.5">
                  {navItems.map((item) => (
                    <SheetClose asChild key={getMarketingNavKey(item)}>
                      <Link
                        className="rounded-lg px-3 py-2.5 text-[0.95rem] font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        href={getMarketingNavHref(item)}
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  ))}
                </nav>

                <div className="mt-4 flex flex-col gap-0.5">
                  <p className="meta-label px-3 pb-1">Resources</p>
                  {resourceLinks.map((link) => (
                    <SheetClose asChild key={link.href}>
                      <Link
                        className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        href={link.href}
                      >
                        {link.label}
                      </Link>
                    </SheetClose>
                  ))}
                </div>
              </SheetBody>

              <SheetFooter className="flex-col gap-2.5 border-t border-border/70">
                {mobileActions}
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
