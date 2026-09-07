import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between",
        className,
      )}
    >
      <div className="min-w-0 max-w-3xl flex-1">
        <div className="flex flex-col gap-2">
          {eyebrow ? <span className="meta-label">{eyebrow}</span> : null}
          <h1 className="font-heading text-xl font-semibold leading-tight tracking-tight text-balance sm:text-2xl">
            {title}
          </h1>
          {description ? (
            <div className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {description}
            </div>
          ) : null}
        </div>
      </div>

      {actions ? (
        <div className="dashboard-actions w-full [&>*]:w-full sm:[&>*]:w-auto xl:w-auto xl:max-w-xl xl:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
