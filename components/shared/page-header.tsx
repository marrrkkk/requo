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
        "flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between",
        className,
      )}
    >
      <div className="min-w-0 max-w-3xl flex-1">
        <div className="flex flex-col gap-3">
          {eyebrow ? <span className="meta-label">{eyebrow}</span> : null}
          <h1 className="font-heading text-[1.65rem] font-semibold leading-tight tracking-tight text-balance sm:text-[2rem] lg:text-[2.3rem]">
            {title}
          </h1>
          {description ? (
            <div className="max-w-2xl text-sm leading-normal sm:leading-7 text-muted-foreground sm:text-[0.96rem]">
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
