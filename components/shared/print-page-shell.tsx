"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import type { ReactNode } from "react";

import { AutoPrintOnLoad } from "@/components/shared/auto-print-on-load";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PrintPageShellProps = {
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
  children: ReactNode;
  className?: string;
};

export function PrintPageShell({
  title,
  description,
  backHref,
  backLabel,
  children,
  className,
}: PrintPageShellProps) {
  return (
    <div className={cn("min-h-screen bg-background text-foreground", className)}>
      <AutoPrintOnLoad />

      <div className="print:hidden">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pb-5 pt-5 sm:px-6 lg:px-8">
          <div className="section-panel flex flex-col gap-4 px-4 py-4 shadow-sm sm:flex-row sm:items-start sm:justify-between sm:px-5">
            <div className="min-w-0">
              <p className="meta-label">Print view</p>
              <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-balance">
                {title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </div>

            <div className="dashboard-actions shrink-0 [&>*]:w-full sm:[&>*]:w-auto">
              <Button asChild variant="outline">
                <Link href={backHref}>
                  <ArrowLeft data-icon="inline-start" />
                  {backLabel}
                </Link>
              </Button>
              <Button onClick={() => window.print()}>
                <Printer data-icon="inline-start" />
                Print
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 pb-8 sm:px-6 lg:px-8 print:max-w-[8.27in] print:px-0 print:pb-0">
        {children}
      </div>
    </div>
  );
}
