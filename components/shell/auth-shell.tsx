import { ReactNode } from "react";

import { BrandMark } from "@/components/shared/brand-mark";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AuthShellProps = {
  badge: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthShell({
  badge,
  title,
  description,
  children,
}: AuthShellProps) {
  return (
    <div className="page-wrap flex min-h-screen items-center py-10">
      <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hero-panel surface-grid hidden min-h-[38rem] flex-col justify-between p-8 lg:flex">
          <BrandMark />
          <div className="max-w-xl space-y-6">
            <span className="eyebrow">{badge}</span>
            <div className="space-y-4">
              <h1 className="font-heading text-5xl font-semibold tracking-tight text-balance">
                Turn messy customer inquiries into organized quotes and bookings.
              </h1>
              <p className="max-w-lg text-base leading-8 text-muted-foreground">
                QuoteFlow gives small service businesses one place to capture
                inquiries, manage status, draft replies, and convert raw work
                into sent quotes.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card size="sm">
              <CardHeader>
                <CardTitle>Owner-first workflow</CardTitle>
                <CardDescription>
                  Built for a single business owner before team complexity.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardTitle>Context-aware AI</CardTitle>
                <CardDescription>
                  Draft concise replies using inquiries, FAQs, and files.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <Card className="w-full max-w-xl shadow-[0_24px_80px_-40px_rgba(37,54,106,0.35)]">
            <CardHeader className="gap-4">
              <BrandMark className="lg:hidden" />
              <div className="space-y-2">
                <span className="eyebrow">{badge}</span>
                <CardTitle className="text-3xl">{title}</CardTitle>
                <CardDescription className="max-w-md text-sm leading-7">
                  {description}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>{children}</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
