import type { ReactNode } from "react";

import { BrandMark } from "@/components/shared/brand-mark";
import { cn } from "@/lib/utils";

type PublicPageShellProps = {
  headerAction?: ReactNode;
  children: ReactNode;
  className?: string;
  brandSubtitle?: string | null;
};

export function PublicPageShell({
  headerAction,
  children,
  className,
  brandSubtitle = null,
}: PublicPageShellProps) {
  return (
    <div className={cn("public-page", className)}>
      <div className="public-page-stack">
        <header className="public-page-header">
          <BrandMark subtitle={brandSubtitle} />
          {headerAction ? (
            <div className="flex w-full flex-col gap-3 [&>*]:w-full sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end sm:[&>*]:w-auto">
              {headerAction}
            </div>
          ) : null}
        </header>

        {children}
      </div>
    </div>
  );
}

type PublicHeroSurfaceProps = {
  children: ReactNode;
  className?: string;
};

export function PublicHeroSurface({
  children,
  className,
}: PublicHeroSurfaceProps) {
  return <section className={cn("public-hero-surface", className)}>{children}</section>;
}
