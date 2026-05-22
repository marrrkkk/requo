"use client";

import {
  BookCopy,
  Bell,
  CreditCard,
  FileText,
  Mail,
  ScrollText,
  Settings2,
  Tags,
  Users,
} from "lucide-react";

import type {
  BusinessSettingsNavigationIcon,
  BusinessSettingsNavigationGroup,
} from "@/features/settings/navigation";
import { SettingsSidebarNav } from "@/features/settings/components/settings-sidebar-nav";

type BusinessSettingsNavProps = {
  groups: BusinessSettingsNavigationGroup[];
};

const settingsNavigationIcons: Record<BusinessSettingsNavigationIcon, typeof Settings2> = {
  general: Settings2,
  members: Users,
  notifications: Bell,
  knowledge: BookCopy,
  quote: FileText,
  email: Mail,
  pricing: Tags,
  billing: CreditCard,
  "audit-log": ScrollText,
};

export function BusinessSettingsNav({ groups }: BusinessSettingsNavProps) {
  return (
    <SettingsSidebarNav
      ariaLabel="Business settings"
      groups={groups}
      icons={settingsNavigationIcons}
    />
  );
}
