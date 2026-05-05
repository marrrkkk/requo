"use client";

import type { LucideIcon } from "lucide-react";
import { ChevronsUpDown } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { cn } from "@/lib/utils";

type SettingsTabsNavItem<TIcon extends string> = {
  href: string;
  label: string;
  icon: TIcon;
};

type SettingsTabsNavGroup<TIcon extends string> = {
  label: string;
  items: SettingsTabsNavItem<TIcon>[];
};

type SettingsTabsNavProps<TIcon extends string> = {
  ariaLabel: string;
  groups: SettingsTabsNavGroup<TIcon>[];
  icons: Record<TIcon, LucideIcon>;
};

function isActiveSettingsTab(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SettingsTabsNav<TIcon extends string>({
  ariaLabel,
  groups,
  icons,
}: SettingsTabsNavProps<TIcon>) {
  const pathname = usePathname();
  const router = useProgressRouter();
  const flatItems = useMemo(
    () => groups.flatMap((group) => group.items),
    [groups],
  );
  const activeItem =
    flatItems
      .filter((item) => isActiveSettingsTab(pathname, item.href))
      .sort((a, b) => b.href.length - a.href.length)[0] ?? flatItems[0];

  function handleTabChange(nextHref: string) {
    if (isActiveSettingsTab(pathname, nextHref)) {
      return;
    }

    router.push(nextHref);
  }

  useEffect(() => {
    for (const item of flatItems) {
      router.prefetch(item.href);
    }
  }, [flatItems, router]);

  if (!activeItem) {
    return null;
  }

  const ActiveIcon = icons[activeItem.icon] as LucideIcon;

  return (
    <nav aria-label={ariaLabel} className="min-w-0 w-full">
      {/* Mobile: combobox dropdown */}
      <SettingsMobileSelect
        activeItem={activeItem}
        ActiveIcon={ActiveIcon}
        groups={groups}
        icons={icons}
        onSelect={handleTabChange}
      />

      {/* Desktop: horizontal tabs */}
      <Tabs
        activationMode="manual"
        className="hidden min-w-0 w-full sm:block"
        onValueChange={handleTabChange}
        value={activeItem.href}
      >
        <div className="min-w-0 w-full overflow-x-auto pb-1 hover-scrollbar">
          <TabsList
            aria-label={ariaLabel}
            className="w-full justify-start"
          >
            {flatItems.map((item) => {
              const Icon = icons[item.icon] as LucideIcon;

              return (
                <TabsTrigger
                  className="min-w-max flex-1 group-data-horizontal/tabs:flex-1"
                  key={item.href}
                  value={item.href}
                >
                  <Icon className="size-4" />
                  {item.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
      </Tabs>
    </nav>
  );
}

function SettingsMobileSelect<TIcon extends string>({
  activeItem,
  ActiveIcon,
  groups,
  icons,
  onSelect,
}: {
  activeItem: SettingsTabsNavItem<TIcon>;
  ActiveIcon: LucideIcon;
  groups: SettingsTabsNavGroup<TIcon>[];
  icons: Record<TIcon, LucideIcon>;
  onSelect: (href: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="sm:hidden">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2">
              <ActiveIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{activeItem.label}</span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="overlay-surface w-[var(--radix-popover-trigger-width)] p-0"
        >
          <Command>
            <CommandList>
              {groups.map((group) => (
                <CommandGroup heading={group.label} key={group.label}>
                  {group.items.map((item) => {
                    const Icon = icons[item.icon] as LucideIcon;
                    const isActive = item.href === activeItem.href;

                    return (
                      <CommandItem
                        key={item.href}
                        onSelect={() => {
                          onSelect(item.href);
                          setOpen(false);
                        }}
                        className={cn(isActive && "font-medium text-primary")}
                        value={item.label}
                      >
                        <Icon
                          className={cn(
                            "size-4 shrink-0",
                            isActive
                              ? "text-primary"
                              : "text-muted-foreground",
                          )}
                        />
                        {item.label}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
