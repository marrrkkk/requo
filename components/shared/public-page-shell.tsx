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
  headerClassName?: string;
  headerRevealOnScroll?: boolean;
};

export function PublicPageShell({
  headerAction,
  headerNav,
  children,
  className,
  brandSubtitle = null,
  headerClassName,
  headerRevealOnScroll = false,
}: PublicPageShellProps) {
  const headerContent = (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-4 lg:gap-6">
        <BrandMark subtitle={brandSubtitle} />
        {headerNav ? <div className="min-w-0 flex-1">{headerNav}</div> : null}
      </div>
      {headerAction ? (
        <div className="public-page-header-actions">
          {headerAction}
        </div>
      ) : null}
    </>
  );

  return (
    <div className={cn("public-page", className)}>
      <div className="public-page-stack">
        {headerRevealOnScroll ? (
          <>
            {/* Static header: always visible in normal document flow */}
            <header className={cn("public-page-header", headerClassName)}>
              {headerContent}
            </header>
            {/* Fixed header: revealed on scroll-up after passing the static one */}
            <PublicPageScrollHeader className={headerClassName}>
              {headerContent}
            </PublicPageScrollHeader>
          </>
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
