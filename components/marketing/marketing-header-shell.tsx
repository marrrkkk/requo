"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

import { resourceLinks } from "@/components/marketing/marketing-data";
import { MarketingPlatformNav } from "@/components/marketing/marketing-platform-nav";
import { MarketingResourcesNav } from "@/components/marketing/marketing-resources-nav";
import { MarketingThemeToggle } from "@/components/marketing/marketing-theme-toggle";
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
const navLinkClass =
  "public-page-header-link font-mono text-xs font-medium uppercase tracking-wider";

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
    <header className="sticky top-0 z-50 w-full bg-[#ffffff]/90 backdrop-blur-md dark:bg-[#161616]/90">
      <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Left side: Brand + Nav items */}
        <div className="flex items-center gap-6 lg:gap-8">
          <BrandMark subtitle={null} size="default" />

          <nav className="hidden items-center gap-1 lg:flex">
            <MarketingPlatformNav triggerClassName={navLinkClass} />
            <MarketingResourcesNav triggerClassName={navLinkClass} />
            <Link className={navLinkClass} href="/pricing">
              Pricing
              <span className="nav-underline" aria-hidden="true" />
            </Link>
            <div className="ml-1 flex items-center">
              <MarketingThemeToggle />
            </div>
          </nav>
        </div>

        {/* Right side: Actions & Mobile toggle */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          <div className="hidden items-center gap-2 sm:flex sm:gap-2.5">
            {actions}
          </div>

          <div className="flex items-center gap-1 lg:hidden">
            <MarketingThemeToggle />
            <Sheet onOpenChange={setOpen} open={open}>
              <SheetTrigger asChild>
                <Button
                  aria-label="Open navigation"
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
                  <div className="flex flex-col gap-0.5">
                    <p className="meta-label px-3 pb-1">Platform</p>
                    <SheetClose asChild>
                      <Link
                        className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        href="/#inquiries"
                      >
                        Inquiry
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        href="/#quotes"
                      >
                        Quote
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        href="/#follow-ups"
                      >
                        Follow-up
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        href="/pricing"
                      >
                        Pricing
                      </Link>
                    </SheetClose>
                  </div>

                  <div className="mt-4 flex flex-col gap-0.5">
                    <p className="meta-label px-3 pb-1">Resources</p>
                    {resourceLinks.map((link) => (
                      <SheetClose asChild key={link.href}>
                        <Link
                          className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
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
      </div>
    </header>
  );
}
