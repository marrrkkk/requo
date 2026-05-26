import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-6 py-20">
      <div className="flex flex-col items-center text-center">
        <p className="select-none font-heading text-[10rem] font-black leading-none tracking-tighter text-foreground/[0.06] sm:text-[16rem] md:text-[20rem]">
          404
        </p>

        <div className="-mt-12 flex flex-col items-center gap-4 sm:-mt-16 md:-mt-20">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Page not found
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            This page doesn&apos;t exist or has been moved.
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
