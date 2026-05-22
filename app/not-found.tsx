import Link from "next/link";
import { ArrowLeft, LayoutDashboard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { dashboardPath } from "@/features/businesses/routes";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-6 py-20">
      <div className="flex flex-col items-center gap-6 text-center">
        <p className="select-none font-heading text-[8rem] font-bold leading-none tracking-tighter text-muted-foreground/10 sm:text-[12rem]">
          404
        </p>

        <div className="-mt-10 flex flex-col items-center gap-3 sm:-mt-14">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Page not found
          </h1>
          <p className="max-w-md text-base leading-relaxed text-muted-foreground">
            This page doesn&apos;t exist or has been moved. Head back home or
            jump into your businesses.
          </p>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button asChild variant="outline" size="lg">
            <Link href="/">
              <ArrowLeft data-icon="inline-start" />
              Go home
            </Link>
          </Button>
          <Button asChild size="lg">
            <Link href={dashboardPath}>
              <LayoutDashboard data-icon="inline-start" />
              Go to dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
