import type { BusinessSettingsNavigationGroup } from "@/features/settings/navigation";

import { BusinessSettingsNavLink } from "./business-settings-nav-link";

type BusinessSettingsNavProps = {
  groups: BusinessSettingsNavigationGroup[];
};

export function BusinessSettingsNav({
  groups,
}: BusinessSettingsNavProps) {
  return (
    <aside className="section-panel overflow-hidden xl:sticky xl:top-[5.5rem]">
      <div className="border-b border-border/70 px-4 py-4 sm:px-5">
        <p className="meta-label">Settings</p>
        <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
          Business setup, reusable responses, and quote configuration.
        </p>
      </div>

      <div className="flex flex-col gap-4 p-3">
        {groups.map((group) => (
          <section className="flex flex-col gap-1" key={group.label}>
            <h2 className="px-3 pb-1 pt-2 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {group.label}
            </h2>

            <div className="flex flex-col gap-1">
              {group.items.map((item) => {
                const Icon = item.icon;

                return (
                  <BusinessSettingsNavLink
                    description={item.description}
                    href={item.href}
                    key={item.href}
                    label={item.label}
                  >
                    <Icon className="size-4" />
                  </BusinessSettingsNavLink>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}
