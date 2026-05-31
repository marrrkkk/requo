"use client";

import { useTransition } from "react";
import { MonitorCog, MoonStar, Sun } from "lucide-react";

import { useTheme } from "@/components/theme-provider";
import { updateThemePreferenceAction } from "@/features/theme/actions";
import {
  isThemePreference,
  themePreferenceLabels,
  themePreferences,
  themeUserStorageKey,
  type ThemePreference,
} from "@/features/theme/types";
import { cn } from "@/lib/utils";

const themePreferenceIcons = {
  light: Sun,
  dark: MoonStar,
  system: MonitorCog,
} satisfies Record<ThemePreference, typeof Sun>;

const themePreferenceDescriptions: Record<ThemePreference, string> = {
  light: "A clean, bright interface for daytime use.",
  dark: "Easier on the eyes in low-light environments.",
  system: "Matches your operating system preference automatically.",
};

type AppearanceSettingsFormProps = {
  userId: string;
};

export function AppearanceSettingsForm({ userId }: AppearanceSettingsFormProps) {
  const { setTheme, theme } = useTheme();
  const [isPending, startTransition] = useTransition();
  const activeTheme = getActiveTheme(theme);

  function handleSelect(value: ThemePreference) {
    if (value === activeTheme || isPending) return;

    const previousTheme = activeTheme;

    window.localStorage.setItem(themeUserStorageKey, userId);
    setTheme(value);

    startTransition(async () => {
      const result = await updateThemePreferenceAction(value);

      if (result.ok) return;

      console.error(result.error);
      setTheme(previousTheme);
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {themePreferences.map((preference) => {
        const Icon = themePreferenceIcons[preference];
        const isActive = activeTheme === preference;

        return (
          <button
            key={preference}
            type="button"
            disabled={isPending}
            onClick={() => handleSelect(preference)}
            className={cn(
              "relative flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-colors",
              "hover:border-primary/40 hover:bg-accent/40",
              isActive
                ? "border-primary bg-accent/50 ring-1 ring-primary/20"
                : "border-border bg-card",
              isPending && "opacity-60 pointer-events-none",
            )}
          >
            <div className="flex w-full items-center justify-between">
              <Icon className="size-5 text-muted-foreground" />
              {isActive && (
                <span className="text-[0.68rem] font-medium uppercase tracking-wider text-primary">
                  Active
                </span>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {themePreferenceLabels[preference]}
              </p>
              <p className="text-xs text-muted-foreground">
                {themePreferenceDescriptions[preference]}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function getActiveTheme(theme: string | undefined): ThemePreference {
  if (theme && isThemePreference(theme)) return theme;
  return "system";
}
