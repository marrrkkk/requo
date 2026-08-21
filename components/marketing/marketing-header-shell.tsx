"use client";

import type { ReactNode } from "react";
import { useState } from "react";
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

/** Shared nav-link class for public/marketing headers. */
const navLinkClass = "public-page-header-link";

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

  return (
    <header className="sticky top-0 z-50 w-full bg-[#ffffff] dark:bg-[#161616]">
      <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6 sm:py-3 lg:px-8">
        <div className="flex items-center">
          <BrandMark subtitle={null} size="default" />
        </div>

        <nav className="public-page-header-nav absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:flex">
          {navItems.map((item) => (
            <Link
              className={navLinkClass}
              href={getMarketingNavHref(item)}
              key={getMarketingNavKey(item)}
            >
              {item.label}
              <span className="nav-underline" aria-hidden="true" />
            </Link>
          ))}
          <MarketingResourcesNav triggerClassName={navLinkClass} />
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
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
                <BrandMark subtitle={null} size="default" />
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
