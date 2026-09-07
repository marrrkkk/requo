"use client";

import { Astroid, BookOpen } from "lucide-react";

import { SettingsTabsNav } from "@/features/settings/components/settings-tabs-nav";

type AiSettingsNavIcon = "assistant" | "knowledge";

type AiSettingsNavGroup = {
  label: string;
  items: { href: string; label: string; icon: AiSettingsNavIcon }[];
};

type AiSettingsNavProps = {
  groups: AiSettingsNavGroup[];
};

const aiSettingsIcons: Record<AiSettingsNavIcon, typeof Astroid | typeof BookOpen> = {
  assistant: Astroid,
  knowledge: BookOpen,
};

export function AiSettingsNav({ groups }: AiSettingsNavProps) {
  return (
    <SettingsTabsNav
      ariaLabel="AI settings navigation"
      groups={groups}
      icons={aiSettingsIcons}
    />
  );
}
