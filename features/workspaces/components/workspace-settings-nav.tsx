"use client";

import { BriefcaseBusiness, CreditCard, ScrollText, Users } from "lucide-react";

import type {
  WorkspaceSettingsNavigationGroup,
  WorkspaceSettingsNavigationIcon,
} from "@/features/workspaces/navigation";
import { SettingsTabsNav } from "@/features/settings/components/settings-tabs-nav";

type WorkspaceSettingsNavProps = {
  groups: WorkspaceSettingsNavigationGroup[];
};

const navigationIcons: Record<
  WorkspaceSettingsNavigationIcon,
  typeof BriefcaseBusiness
> = {
  general: BriefcaseBusiness,
  members: Users,
  billing: CreditCard,
  audit: ScrollText,
};

export function WorkspaceSettingsNav({ groups }: WorkspaceSettingsNavProps) {
  return (
    <SettingsTabsNav
      ariaLabel="Workspace settings"
      groups={groups}
      icons={navigationIcons}
    />
  );
}
