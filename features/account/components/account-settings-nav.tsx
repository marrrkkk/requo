"use client";

import { Shield, User, CreditCard } from "lucide-react";

import type {
  AccountSettingsNavigationGroup,
  AccountSettingsNavigationIcon,
} from "@/features/account/navigation";
import { SettingsTabsNav } from "@/features/settings/components/settings-tabs-nav";

type AccountSettingsNavProps = {
  groups: AccountSettingsNavigationGroup[];
};

const navigationIcons: Record<
  AccountSettingsNavigationIcon,
  typeof User
> = {
  profile: User,
  security: Shield,
  billing: CreditCard,
};

export function AccountSettingsNav({ groups }: AccountSettingsNavProps) {
  return (
    <SettingsTabsNav
      ariaLabel="User settings"
      groups={groups}
      icons={navigationIcons}
    />
  );
}
