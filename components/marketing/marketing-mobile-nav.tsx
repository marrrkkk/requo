"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu } from "lucide-react";

import { navItems } from "@/components/marketing/marketing-data";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function MarketingMobileNav() {
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

      <SheetContent className="w-[90vw] p-0 sm:max-w-sm" side="right">
        <SheetHeader className="gap-2 p-5">
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>
            Jump to the sections or start your account.
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <div className="flex flex-col gap-1 p-4">
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
        </div>

        <Separator />

        <SheetFooter className="gap-3 p-5">
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
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
