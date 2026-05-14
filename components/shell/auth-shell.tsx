import {
  MessageSquareText,
  ReceiptText,
  Sparkles,
  ArrowRight,
} from "lucide-react";
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
  badge?: string;
  title: string;
  description?: string;
  children: ReactNode;
  layout?: "split" | "centered" | "signup";
};

export function AuthShell({
  badge,
  title,
  description,
  children,
  layout = "split",
}: AuthShellProps) {
  if (layout === "centered") {
    return (
      <div className="auth-page">
        <div className="mx-auto w-full max-w-[30rem]">
          <AuthFormCard badge={badge} title={title} description={description}>
            {children}
          </AuthFormCard>
        </div>
      </div>
    );
  }

  if (layout === "signup") {
    return (
      <div className="flex min-h-dvh w-full flex-col lg:flex-row">
        {/* Left: Form side */}
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8 lg:px-12 xl:px-16">
          <div className="w-full max-w-[26rem]">
            <div className="mb-8 lg:hidden">
              <BrandMark subtitle={null} />
            </div>
            <AuthFormPlain badge={badge} title={title} description={description} hideBrandMark>
              {children}
            </AuthFormPlain>
          </div>
        </div>

        {/* Right: Visual branded panel */}
        <div className="auth-visual-panel">
          <div className="relative z-10 flex h-full flex-col justify-between p-8 sm:p-10 lg:p-12 xl:p-16">
            <div className="auth-visual-brand">
              <BrandMark subtitle={null} />
            </div>

            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-4">
                <h2 className="font-heading text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl xl:text-[2.75rem]">
                  Turn inquiries into
                  <br />
                  accepted quotes.
                </h2>
                <p className="max-w-md text-base leading-relaxed text-white/70 sm:text-lg">
                  The workflow tool for owner-led service businesses that handle
                  custom pricing.
                </p>
              </div>

              <div className="grid gap-5">
                {[
                  {
                    icon: MessageSquareText,
                    text: "Capture scope, timing, and budget in one form",
                  },
                  {
                    icon: ReceiptText,
                    text: "Send professional quotes with line items",
                  },
                  {
                    icon: Sparkles,
                    text: "Track views, acceptances, and follow up on time",
                  },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="flex items-center gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                        <Icon className="h-4.5 w-4.5 text-white/90" />
                      </div>
                      <p className="text-sm font-medium text-white/85 sm:text-[0.94rem]">
                        {item.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-white/50">
              <ArrowRight className="h-3.5 w-3.5" />
              <span>Free to start. No credit card required.</span>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/[0.04] blur-3xl" />
            <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/[0.03] blur-3xl" />
            <div className="absolute right-12 top-1/3 h-48 w-48 rounded-full bg-white/[0.02] blur-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-shell-grid">
        <div className="auth-story-panel">
          <div className="flex items-center gap-4">
            <BrandMark subtitle={null} />
          </div>

          <div className="flex max-w-2xl flex-col gap-5">
            <span className="eyebrow">Owner-led service workflow</span>
            <div className="flex flex-col gap-3">
              <h1 className="font-heading text-5xl font-semibold leading-[0.96] tracking-tight text-balance">
                Capture inquiries, qualify leads, and send quotes from one place.
              </h1>
              <p className="max-w-xl text-base leading-normal sm:leading-8 text-muted-foreground">
                Requo keeps inbound inquiries, pricing, and follow-up organized
                for owner-led service businesses and lean teams.
              </p>
            </div>
          </div>

          <div className="soft-panel grid gap-3 p-5">
            {[
              "Collect scope, timing, budget, and files without extra back-and-forth.",
              "Qualify the lead before pricing and keep notes attached to the inquiry.",
              "Send professional quotes and keep the customer response in the same flow.",
            ].map((item) => (
              <div className="flex items-start gap-3" key={item}>
                <div className="mt-0.5 rounded-md bg-accent px-2 py-1 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-accent-foreground">
                  Ready
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="auth-form-shell">
          <AuthFormCard badge={badge} title={title} description={description}>
            {children}
          </AuthFormCard>
        </div>
      </div>
    </div>
  );
}

function AuthFormCard({
  badge,
  title,
  description,
  children,
}: Pick<AuthShellProps, "badge" | "title" | "description" | "children">) {
  return (
    <Card className="auth-form-card gap-0">
      <CardHeader className="gap-4 border-b border-border/70 bg-background/34 pb-6">
        <BrandMark subtitle={null} />
        <div className="flex flex-col gap-2.5">
          {badge ? <span className="eyebrow">{badge}</span> : null}
          <CardTitle className="text-[1.95rem] sm:text-[2.35rem]">{title}</CardTitle>
          {description ? (
            <CardDescription className="max-w-md text-sm leading-normal sm:leading-7">
              {description}
            </CardDescription>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pt-6 sm:pt-7">{children}</CardContent>
    </Card>
  );
}

function AuthFormPlain({
  badge,
  title,
  description,
  children,
  hideBrandMark,
}: Pick<AuthShellProps, "badge" | "title" | "description" | "children"> & { hideBrandMark?: boolean }) {
  return (
    <div className="flex w-full max-w-[26rem] flex-col gap-8">
      <div className="flex flex-col gap-6">
        {!hideBrandMark && <BrandMark subtitle={null} />}
        <div className="flex flex-col gap-2.5">
          {badge ? <span className="eyebrow">{badge}</span> : null}
          <h1 className="font-heading text-[1.95rem] font-semibold tracking-tight sm:text-[2.35rem]">
            {title}
          </h1>
          {description ? (
            <p className="max-w-md text-sm leading-normal sm:leading-7 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}
