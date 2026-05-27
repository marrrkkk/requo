import type { ReactNode } from "react";

import { BrandMark } from "@/components/shared/brand-mark";
import { PublicPageScrollHeader } from "@/components/shared/public-page-scroll-header";
import { cn } from "@/lib/utils";

type PublicPageShellProps = {
  headerAction?: ReactNode;
  headerNav?: ReactNode;
  children: ReactNode;
  className?: string;
  brandSubtitle?: string | null;
  brandSize?: "default" | "lg";
  headerClassName?: string;
  headerRevealOnScroll?: boolean;
  headerStickyFullWidth?: boolean;
};

export function PublicPageShell({
  headerAction,
  headerNav,
  children,
  className,
  brandSubtitle = null,
  brandSize = "default",
  headerClassName,
  headerRevealOnScroll = false,
  headerStickyFullWidth = false,
}: PublicPageShellProps) {
  const headerContent = (
    <>
      <div className="flex min-w-0 shrink-0 items-center gap-4 lg:gap-6">
        <BrandMark subtitle={brandSubtitle} size={brandSize} />
      </div>
      {headerNav ? (
        <div className="hidden min-w-0 flex-1 justify-center lg:flex">
          {headerNav}
        </div>
      ) : (
        <div className="flex-1" aria-hidden="true" />
      )}
      {headerAction ? (
        <div className="public-page-header-actions">
          {headerAction}
        </div>
      ) : null}
    </>
  );

  if (headerStickyFullWidth) {
    return (
      <>
        <header
          className={cn(
            "sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-colors",
            headerClassName
          )}
        >
          <div className="mx-auto flex h-16 w-full max-w-[90rem] items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6 md:px-6 lg:px-8">
            {headerContent}
          </div>
        </header>
        <div className={cn("public-page", className)}>
          <div className="public-page-stack">
            <main className="contents">{children}</main>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className={cn("public-page", className)}>
      <div className="public-page-stack">
        {headerRevealOnScroll ? (
          <PublicPageScrollHeader className={headerClassName}>
            {headerContent}
          </PublicPageScrollHeader>
        ) : (
          <header className={cn("public-page-header", headerClassName)}>
            {headerContent}
          </header>
        )}

        <main className="contents">{children}</main>
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
