"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

import { BrandMark } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { legalNavItems } from "@/features/legal/config";

export function LegalHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-[#ffffff] dark:bg-[#161616]">
      <div className="mx-auto flex w-full items-center justify-between gap-6 px-5 py-4 sm:px-8 sm:py-5 lg:px-10">
        {/* Left: brand + nav */}
        <div className="flex items-center gap-6 sm:gap-8">
          <BrandMark subtitle={null} size="lg" />

          <nav className="public-page-header-nav">
            {legalNavItems.map((item) => (
              <Link
                className="public-page-header-link"
                href={item.href}
                key={item.href}
              >
                {item.label}
                <span className="nav-underline" aria-hidden="true" />
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: mobile nav only */}
        <div className="flex shrink-0 items-center justify-end">
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
                  {legalNavItems.map((item) => (
                    <SheetClose asChild key={item.href}>
                      <Link
                        className="rounded-lg px-3 py-2.5 text-[0.95rem] font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        href={item.href}
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  ))}
                </nav>
              </SheetBody>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
