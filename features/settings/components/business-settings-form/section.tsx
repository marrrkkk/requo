"use client";

import type { ReactNode } from "react";

type GeneralSettingsSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function GeneralSettingsSection({
  title,
  description,
  children,
}: GeneralSettingsSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
