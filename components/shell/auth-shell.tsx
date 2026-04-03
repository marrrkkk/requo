import { ReactNode } from "react";
import { CheckCircle2, FileText, Inbox, Sparkles } from "lucide-react";

import { BrandMark } from "@/components/shared/brand-mark";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="page-wrap flex min-h-screen items-center py-6 sm:py-10">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
        <div className="hero-panel hidden p-8 lg:flex lg:flex-col lg:justify-between">
          <BrandMark />

          <div className="flex max-w-xl flex-col gap-6">
            <span className="eyebrow">QuoteFlow workspace</span>
            <div className="flex flex-col gap-4">
              <h1 className="font-heading text-5xl font-semibold leading-[0.95] tracking-tight text-balance">
                Inquiry, quotes, and reply drafting in one clean workspace.
              </h1>
              <p className="max-w-lg text-base leading-8 text-muted-foreground">
                Built for small service businesses that need a faster way to intake
                requests, turn them into quotes, and keep customer communication tidy.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <AuthSignal
                description="Capture scope, timing, and files in one place."
                icon={Inbox}
                label="Inbox"
              />
              <AuthSignal
                description="Draft and send polished quotes without extra admin."
                icon={FileText}
                label="Quotes"
              />
              <AuthSignal
                description="Generate practical responses from your own business context."
                icon={Sparkles}
                label="AI assist"
              />
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl border border-border/80 bg-background/70 p-4 sm:grid-cols-2">
            {[
              "Owner-first dashboard layout",
              "Workspace setup after first signup",
              "Protected auth and password recovery",
              "Customer-safe public inquiry and quote pages",
            ].map((item) => (
              <div className="flex items-start gap-3" key={item}>
                <div className="mt-0.5 rounded-md bg-accent p-1 text-accent-foreground">
                  <CheckCircle2 className="size-4" />
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center">
          <Card className="w-full max-w-xl">
            <CardHeader className="gap-4">
              <BrandMark className="lg:hidden" />
              <div className="flex flex-col gap-3">
                <span className="eyebrow">{badge}</span>
                <CardTitle className="text-3xl sm:text-4xl">{title}</CardTitle>
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

function AuthSignal({
  description,
  icon: Icon,
  label,
}: {
  description: string;
  icon: typeof Inbox;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-background/70 p-4">
      <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <Icon className="size-4" />
      </div>
      <p className="mt-4 text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
