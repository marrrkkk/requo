import Link from "next/link";
import type { ReactNode } from "react";

import { PublicPageShell } from "@/components/shared/public-page-shell";
import { Separator } from "@/components/ui/separator";
import { legalConfig, legalNavItems } from "@/features/legal/config";
import { cn } from "@/lib/utils";

export type LegalDocumentSection = {
  id: string;
  title: string;
  content: ReactNode;
};

type LegalDocumentPageProps = {
  title: string;
  sections: LegalDocumentSection[];
};

export function LegalDocumentPage({
  title,
  sections,
}: LegalDocumentPageProps) {
  return (
    <PublicPageShell
      brandSubtitle={null}
      className="pb-10 lg:pb-14"
      headerClassName="sticky top-0 z-40 rounded-none border-x-0 border-t-0 bg-background/92 px-0 py-4 shadow-none backdrop-blur-xl supports-backdrop-filter:bg-background/88 md:px-0"
      headerNav={
        <nav className="public-page-header-nav">
          {legalNavItems.map((item) => (
            <Link className="public-page-header-link" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      }
    >
      <section className="section-panel mx-auto w-full max-w-4xl overflow-hidden">
        <div className="border-b border-border/70 px-5 py-6 sm:px-8 sm:py-8">
          <p className="meta-label">Effective date</p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {legalConfig.effectiveDate}
          </p>
          <h1 className="mt-5 font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {title}
          </h1>
        </div>

        <div className="px-5 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
            {sections.map((section, index) => (
              <div className="flex flex-col gap-8" key={section.id}>
                <section className="scroll-mt-28" id={section.id}>
                  <div className="flex flex-col gap-4">{section.content}</div>
                </section>
                {index < sections.length - 1 ? <Separator className="bg-border/70" /> : null}
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}

export function LegalSectionHeading({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "scroll-m-20 text-2xl font-semibold tracking-tight text-foreground sm:text-[1.7rem]",
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function LegalSubheading({ children }: { children: ReactNode }) {
  return (
    <h3 className="scroll-m-20 text-lg font-semibold tracking-tight text-foreground">
      {children}
    </h3>
  );
}

export function LegalParagraph({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-7 text-muted-foreground sm:text-[0.98rem]">{children}</p>;
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="grid gap-2 pl-5 text-sm leading-7 text-muted-foreground sm:text-[0.98rem]">
      {items.map((item, index) => (
        <li className="list-disc" key={index}>
          {item}
        </li>
      ))}
    </ul>
  );
}
