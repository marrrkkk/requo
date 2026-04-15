"use client";

import {
  BookCopy,
  Bell,
  Cable,
  CreditCard,
  FileText,
  Mail,
  MessageSquareText,
  Settings2,
  Shield,
  Tags,
  Users,
  User,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import type {
  BusinessSettingsNavigationIcon,
  BusinessSettingsNavigationGroup,
} from "@/features/settings/navigation";
import { useProgressRouter } from "@/hooks/use-progress-router";
import {
  Combobox,
  type ComboboxOptionGroup,
} from "@/components/ui/combobox";
import { BusinessSettingsNavLink } from "./business-settings-nav-link";

type BusinessSettingsNavProps = {
  groups: BusinessSettingsNavigationGroup[];
};

type SettingsNavComboboxOption = {
  icon: BusinessSettingsNavigationIcon;
  label: string;
  searchText: string;
  value: string;
};

const settingsNavigationIcons: Record<BusinessSettingsNavigationIcon, typeof User> = {
  profile: User,
  security: Shield,
  general: Settings2,
  members: Users,
  notifications: Bell,
  replies: MessageSquareText,
  knowledge: BookCopy,
  quote: FileText,
  email: Mail,
  pricing: Tags,
  integrations: Cable,
  billing: CreditCard,
};

function isActiveSettingsItem(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BusinessSettingsNav({ groups }: BusinessSettingsNavProps) {
  const pathname = usePathname();
  const router = useProgressRouter();
  const flatItems = groups.flatMap((group) => group.items);
  const activeItem = flatItems.find((item) => isActiveSettingsItem(pathname, item.href));
  const comboboxGroups: ComboboxOptionGroup<SettingsNavComboboxOption>[] = groups.map((group) => ({
    heading: group.label,
    options: group.items.map((item) => ({
      icon: item.icon,
      label: item.label,
      searchText: `${group.label} ${item.label}`,
      value: item.href,
    })),
  }));

  useEffect(() => {
    for (const item of flatItems) {
      router.prefetch(item.href);
    }
  }, [flatItems, router]);

  if (!flatItems.length) {
    return null;
  }

  return (
    <div className="min-w-0 xl:w-64 xl:justify-self-start xl:sticky xl:top-[5.5rem] xl:self-start">
      <div className="px-1 pb-1 xl:hidden">
        <div className="flex flex-col gap-2">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Settings section
          </p>

          <Combobox
            groups={comboboxGroups}
            id="settings-section"
            onValueChange={(value) => {
              if (isActiveSettingsItem(pathname, value)) {
                return;
              }

              router.push(value);
            }}
            placeholder="Choose a settings section"
            renderOption={(option) => {
              const Icon = settingsNavigationIcons[option.icon];

              return (
                <span className="flex items-center gap-2">
                  <Icon className="size-4 text-muted-foreground" />
                  <span>{option.label}</span>
                </span>
              );
            }}
            renderValue={(option) => {
              const Icon = settingsNavigationIcons[option.icon];

              return (
                <span className="flex min-w-0 items-center gap-2 text-left">
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{option.label}</span>
                </span>
              );
            }}
            searchPlaceholder="Search settings section"
            value={activeItem?.href ?? ""}
          />
        </div>
      </div>

      <aside className="hidden xl:block">
        <nav className="flex flex-col gap-3 pr-3">
          {groups.map((group) => (
            <div className="flex flex-col gap-0.5" key={group.label}>
              <p className="px-2.5 pb-0.5 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = settingsNavigationIcons[item.icon];

                  return (
                    <BusinessSettingsNavLink
                      href={item.href}
                      isActive={isActiveSettingsItem(pathname, item.href)}
                      key={item.href}
                      label={item.label}
                    >
                      <Icon className="size-4" />
                    </BusinessSettingsNavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </div>
  );
}
