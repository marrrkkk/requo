"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Menu } from "lucide-react";

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
import { cn } from "@/lib/utils";

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

export function LegalHeader() {
  const [open, setOpen] = useState(false);
  const scrolled = useScrolled();

  return (
    <header className="pointer-events-none sticky top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4 lg:px-8">
      <div
        className={cn(
          "pointer-events-auto relative mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 rounded-2xl border px-4 sm:h-[3.75rem] sm:gap-4 sm:px-5",
          scrolled
            ? "border-border/60 bg-background/80 shadow-sm backdrop-blur-xl"
            : "border-transparent bg-transparent",
        )}
      >
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

        <div className="flex shrink-0 items-center justify-end gap-2">
          <Button
            asChild
            className="hidden sm:inline-flex"
            size="sm"
            variant="ghost"
          >
            <Link href="/">
              <ArrowLeft data-icon="inline-start" />
              Back to home
            </Link>
          </Button>

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
