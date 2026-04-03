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
    <div className="auth-page">
      <div className="auth-shell-grid">
        <div className="auth-story-panel">
          <div className="flex items-center justify-between gap-4">
            <BrandMark />
            <span className="eyebrow">Owner workspace</span>
          </div>

          <div className="flex max-w-3xl flex-col gap-8">
            <div className="flex max-w-2xl flex-col gap-4">
              <h1 className="font-heading text-5xl font-semibold leading-[0.95] tracking-tight text-balance">
                Inquiry, quotes, and customer replies in one calm workspace.
              </h1>
              <p className="max-w-xl text-base leading-8 text-muted-foreground">
                Built for small service businesses that need a practical system for
                intake, quote drafting, and polished follow-up without admin sprawl.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <AuthSignal
                description="Capture scope, timing, and files in a structured intake flow."
                icon={Inbox}
                label="Organized intake"
              />
              <AuthSignal
                description="Draft and send customer-ready quotes from the same workspace."
                icon={FileText}
                label="Quote workflow"
              />
              <AuthSignal
                description="Generate practical replies using your stored business context."
                icon={Sparkles}
                label="AI support"
              />
            </div>
          </div>

          <div className="soft-panel grid gap-4 p-5 sm:grid-cols-2">
            {[
              "Workspace setup happens automatically after first signup",
              "Email/password auth with protected routes and reset flow",
              "Public inquiry and quote pages stay customer-safe",
              "Clean owner-first dashboard for day-to-day work",
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

        <div className="auth-form-shell">
          <Card className="auth-form-card gap-0">
            <CardHeader className="gap-5 border-b border-border/70 bg-background/34">
              <BrandMark className="xl:hidden" subtitle={null} />
              <div className="flex flex-col gap-3">
                <span className="eyebrow">{badge}</span>
                <CardTitle className="text-3xl sm:text-4xl">{title}</CardTitle>
                <CardDescription className="max-w-md text-sm leading-7">
                  {description}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-6">{children}</CardContent>
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
    <div className="auth-note">
      <div className="flex size-9 items-center justify-center rounded-lg border border-border/70 bg-accent/85 text-accent-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
        <Icon className="size-4" />
      </div>
      <p className="mt-4 text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
