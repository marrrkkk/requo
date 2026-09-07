import type { ReactNode } from "react";

import { DashboardSection } from "@/components/shared/dashboard-layout";

export function AnalyticsSection({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <DashboardSection
      title={
        <div className="flex flex-col gap-1">
          {eyebrow ? <span className="meta-label">{eyebrow}</span> : null}
          <div className="font-heading text-base font-semibold tracking-tight">
            {title}
          </div>
          {description ? (
            <div className="text-sm leading-6 text-muted-foreground">
              {description}
            </div>
          ) : null}
        </div>
      }
      className={className}
    >
      {children}
    </DashboardSection>
  );
}

