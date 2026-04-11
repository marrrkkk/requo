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
  badge: string;
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
      <div className="auth-page xl:overflow-hidden xl:py-0">
        <div className="mx-auto grid w-full max-w-[82rem] items-center gap-6 xl:grid-cols-[30rem_minmax(0,1fr)] xl:gap-5">
          <div className="auth-form-shell xl:justify-start">
            <AuthFormCard badge={badge} title={title} description={description}>
              {children}
            </AuthFormCard>
          </div>
          <SignupShowcase />
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
              <p className="max-w-xl text-base leading-8 text-muted-foreground">
                Requo keeps inbound requests, pricing, and follow-up organized
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
          <span className="eyebrow">{badge}</span>
          <CardTitle className="text-[1.95rem] sm:text-[2.35rem]">{title}</CardTitle>
          {description ? (
            <CardDescription className="max-w-md text-sm leading-7">
              {description}
            </CardDescription>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pt-6 sm:pt-7">{children}</CardContent>
    </Card>
  );
}

function SignupShowcase() {
  return (
    <div className="hidden xl:flex xl:min-h-0 xl:items-center xl:justify-start xl:overflow-visible">
      <Card className="relative w-[62rem] max-w-none gap-0 overflow-hidden border-border/85 bg-card/96 shadow-[0_28px_80px_-46px_rgba(15,23,42,0.34)]">
        <CardContent className="overflow-hidden px-0 pt-0 pb-0">
          <div className="border-b border-border/70 px-5 pt-5 pb-4">
            <span className="eyebrow">Preview</span>
            <div className="mt-3 max-w-2xl">
              <h2 className="font-heading text-[1.58rem] font-semibold tracking-tight text-foreground">
                Capture inquiries, qualify leads, send quotes, and follow up.
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Keep inquiry capture, qualification, quote prep, and follow-up in one place.
              </p>
            </div>
          </div>

          <div className="overflow-hidden bg-[linear-gradient(180deg,rgba(248,250,248,0.92),rgba(242,246,243,0.98))] px-5 pt-4 pb-4 dark:bg-[linear-gradient(180deg,rgba(27,27,27,0.96),rgba(20,20,20,0.99))]">
            <div className="auth-signup-dashboard w-full rounded-[1.15rem] border border-border/80 bg-background/95 p-3 shadow-[0_20px_44px_-30px_rgba(15,23,42,0.24)] dark:bg-card/95">
              <div className="flex items-center justify-between gap-4 border-b border-border/70 pb-2.5">
                <div>
                  <p className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Inquiry workflow
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    Harbor Roast storefront refresh
                  </p>
                </div>
                <div className="dashboard-meta-pill min-h-0 px-3 py-1 text-[0.68rem]">
                  Quote ready
                </div>
              </div>

              <div className="mt-3 grid gap-3 xl:grid-cols-[1.18fr_1fr_0.92fr]">
                <div className="soft-panel p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Public inquiry
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Scope, timing, budget, and files stay attached from the first inquiry.
                      </p>
                    </div>
                    <MessageSquareText className="size-4 text-muted-foreground" />
                  </div>

                  <div className="mt-3 grid gap-2.5">
                    <div className="rounded-lg border border-border/75 bg-background/90 px-3.5 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Harbor Roast
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            New fascia sign, vinyl hours, and install before the Friday relaunch.
                          </p>
                        </div>
                        <span className="rounded-full bg-emerald-500/12 px-2.5 py-1 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-200">
                          New
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-2.5 grid-cols-3">
                      <PreviewMetric label="Due" value="Fri" tone="emerald" />
                      <PreviewMetric label="Files" value="4" tone="slate" />
                      <PreviewMetric label="Budget" value="6k" tone="amber" />
                    </div>

                    <div className="rounded-lg border border-border/75 bg-background/90 px-3.5 py-3">
                      <div className="flex items-center gap-2">
                        <Paperclip className="size-3.5 text-muted-foreground" />
                        <p className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          Attachments
                        </p>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {[
                          "site-photos.zip",
                          "measurements.pdf",
                          "menu-panel.ai",
                        ].map((file) => (
                          <span
                            className="rounded-full border border-border/75 bg-background px-2.5 py-1 text-xs text-muted-foreground"
                            key={file}
                          >
                            {file}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="soft-panel p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <ReceiptText className="size-4 text-primary" />
                      <p className="text-sm font-semibold text-foreground">Draft quote</p>
                    </div>
                    <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Line items
                    </p>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {[
                      ["Site measure and prep", "$480"],
                      ["Fabrication and print", "$3,050"],
                      ["Install and finishing", "$1,180"],
                    ].map(([label, amount]) => (
                      <div
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/75 bg-background/90 px-3 py-2.5"
                        key={label}
                      >
                        <p className="text-sm font-medium text-foreground">{label}</p>
                        <p className="text-sm font-semibold text-foreground">{amount}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-border/75 bg-background/90 px-3 py-2.5">
                      <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        Valid until
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">Apr 18</p>
                    </div>
                    <div className="rounded-lg border border-border/75 bg-background/90 px-3 py-2.5">
                      <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        Deposit
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">50%</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/70 pt-3">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-base font-semibold text-foreground">$4,710</p>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="soft-panel p-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-primary" />
                      <p className="text-sm font-semibold text-foreground">Reply draft</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      Thanks for sending the measurements. I attached the quote
                      with fabrication, install, and turnaround details for the
                      relaunch week.
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-border/75 bg-background/90 px-3 py-2.5">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        Ready to send
                      </p>
                      <ArrowUpRight className="size-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="soft-panel p-3">
                    <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Next step
                    </p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      Hold Thursday for install
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Customer sees the quote, replies on the same page, and the owner keeps the full context.
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-border/75 bg-background/90 px-3 py-2.5">
                      <p className="text-xs font-medium text-foreground">Status</p>
                      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-200">
                        Awaiting approval
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PreviewMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "slate" | "amber";
}) {
  const toneClasses = {
    emerald:
      "border-emerald-200/70 bg-emerald-50/80 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100",
    slate:
      "border-border/75 bg-background/90 text-foreground dark:bg-background/55",
    amber:
      "border-amber-200/70 bg-amber-50/80 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100",
  } as const;

  return (
    <div className={cn("rounded-lg border px-3.5 py-3", toneClasses[tone])}>
      <p className="text-[0.72rem] font-medium uppercase tracking-[0.14em] opacity-75">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}
