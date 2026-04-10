"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu } from "lucide-react";

import { navItems } from "@/components/marketing/marketing-data";
import { Button } from "@/components/ui/button";
import { businessesHubPath } from "@/features/businesses/routes";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type MarketingMobileNavProps = {
  isAuthenticated: boolean;
};

export function MarketingMobileNav({
  isAuthenticated,
}: MarketingMobileNavProps) {
  const [open, setOpen] = useState(false);

  const closeMenu = () => {
    setOpen(false);
  };

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger asChild>
        <Button
          aria-label="Open navigation"
          className="lg:hidden"
          size="icon-sm"
          variant="outline"
        >
          <Menu />
        </Button>
      </SheetTrigger>

      <SheetContent className="w-[90vw] sm:max-w-sm" side="right">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>
            {isAuthenticated
              ? "Jump to the sections or open your dashboard."
              : "Jump to the sections or start your account."}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="gap-1 py-4">
          {navItems.map((item) => (
            <Button
              asChild
              className="h-11 justify-start text-left"
              key={item.href}
              variant="ghost"
            >
              <Link href={item.href} onClick={closeMenu}>
                {item.label}
              </Link>
            </Button>
          ))}
        </SheetBody>

        <SheetFooter className="gap-3">
          {isAuthenticated ? (
            <Button asChild>
              <Link href={businessesHubPath} onClick={closeMenu}>
                Visit app
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild>
                <Link href="/signup" onClick={closeMenu}>
                  Start free
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/login" onClick={closeMenu}>
                  Log in
                </Link>
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
