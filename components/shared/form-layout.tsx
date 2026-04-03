import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type FormSectionProps = {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
};

export function FormSection({
  title,
  description,
  action,
  children,
  className,
  headerClassName,
  contentClassName,
}: FormSectionProps) {
  const hasHeader = Boolean(title || description || action);

  return (
    <section className={cn("form-section", className)}>
      {hasHeader ? (
        <div className={cn("form-section-header", headerClassName)}>
          <div className="min-w-0 space-y-1.5">
            {title ? <h3 className="form-section-title">{title}</h3> : null}
            {description ? (
              <p className="form-section-description">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className={cn("form-section-body", contentClassName)}>{children}</div>
    </section>
  );
}

type FormActionsProps = {
  children: ReactNode;
  className?: string;
  align?: "start" | "end" | "between";
};

const formActionAlignClassNames = {
  start: "md:justify-start",
  end: "md:justify-end",
  between: "md:justify-between",
} as const;

export function FormActions({
  children,
  className,
  align = "end",
}: FormActionsProps) {
  return (
    <div className={cn("form-actions", formActionAlignClassNames[align], className)}>
      {children}
    </div>
  );
}

type FormNoteProps = {
  children: ReactNode;
  className?: string;
};

export function FormNote({ children, className }: FormNoteProps) {
  return <div className={cn("form-note", className)}>{children}</div>;
}
