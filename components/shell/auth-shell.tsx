import {
  ArrowUpRight,
  MessageSquareText,
  Paperclip,
  ReceiptText,
  Sparkles,
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
import { cn } from "@/lib/utils";

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
      <div className="auth-page xl:overflow-hidden xl:py-0 relative">
        <div className="absolute left-6 top-6 z-10 sm:left-8 sm:top-8 xl:left-10 xl:top-10">
          <BrandMark subtitle={null} />
        </div>
        <div className="mx-auto flex w-full max-w-[76rem] flex-col gap-10 px-5 py-10 sm:px-6 xl:grid xl:h-screen xl:grid-cols-[1fr_auto_1fr] xl:items-center xl:gap-16 xl:px-8 xl:py-0">
          <div className="flex w-full justify-center xl:justify-end">
            <AuthFormPlain badge={badge} title={title} description={description} hideBrandMark>
              {children}
            </AuthFormPlain>
          </div>
          <div className="hidden h-[40rem] w-px shrink-0 bg-border/70 xl:block" />
          <div className="flex w-full justify-center xl:justify-start">
            <SignupBenefits />
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
    <div className="flex w-full max-w-[26rem] flex-col gap-8 pt-12 xl:pt-0">
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

function SignupBenefits() {
  return (
    <div className="hidden xl:flex xl:w-full xl:max-w-[28rem] xl:flex-col xl:justify-center">
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Built for service businesses.
          </h2>
          <p className="text-base leading-normal sm:leading-7 text-muted-foreground sm:text-lg">
            Stop losing track of inquiries and scattered quotes.
          </p>
        </div>
        
        <div className="grid gap-8 mt-2">
          {[
            {
              icon: MessageSquareText,
              title: "Capture every inquiry",
              description: "Use clean public forms to collect exactly what you need before quoting."
            },
            {
              icon: ReceiptText,
              title: "Send quotes faster",
              description: "Keep the job details open right next to your pricing and line items."
            },
            {
              icon: Sparkles,
              title: "Never miss a follow-up",
              description: "Know immediately when a quote is viewed, accepted, or needs a nudge."
            }
          ].map((benefit, i) => {
            const Icon = benefit.icon;
            return (
              <div key={i} className="flex items-start gap-5">
                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-base font-medium text-foreground">{benefit.title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
