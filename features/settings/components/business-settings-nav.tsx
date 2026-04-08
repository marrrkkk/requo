"use client";

import {
  BookCopy,
  Bell,
  FileText,
  MessageSquareText,
  Settings2,
  Tags,
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BusinessSettingsNavLink } from "./business-settings-nav-link";

type BusinessSettingsNavProps = {
  groups: BusinessSettingsNavigationGroup[];
};

const settingsNavigationIcons: Record<BusinessSettingsNavigationIcon, typeof User> = {
  profile: User,
  general: Settings2,
  notifications: Bell,
  replies: MessageSquareText,
  knowledge: BookCopy,
  quote: FileText,
  pricing: Tags,
};

function isActiveSettingsItem(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BusinessSettingsNav({ groups }: BusinessSettingsNavProps) {
  const pathname = usePathname();
  const router = useProgressRouter();
  const flatItems = groups.flatMap((group) => group.items);
  const activeItem = flatItems.find((item) => isActiveSettingsItem(pathname, item.href));

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

          <Select
            onValueChange={(value) => {
              if (isActiveSettingsItem(pathname, value)) {
                return;
              }

              router.push(value);
            }}
            value={activeItem?.href}
          >
            <SelectTrigger aria-label="Select a settings section" className="w-full">
              <SelectValue placeholder="Choose a settings section" />
            </SelectTrigger>
            <SelectContent align="start" position="popper">
              {groups.map((group) => (
                <SelectGroup key={group.label}>
                  <SelectLabel>{group.label}</SelectLabel>
                  {group.items.map((item) => {
                    const Icon = settingsNavigationIcons[item.icon];

                    return (
                      <SelectItem key={item.href} value={item.href}>
                        <span className="flex items-center gap-2">
                          <Icon className="size-4 text-muted-foreground" />
                          <span>{item.label}</span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <aside className="hidden xl:block">
        <nav className="flex flex-col gap-4 pr-3">
          {groups.map((group) => (
            <div className="flex flex-col gap-1" key={group.label}>
              <p className="px-3 pb-1 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {group.label}
              </p>
              <div className="flex flex-col gap-1">
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
