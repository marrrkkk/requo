"use client";

import {
  BookCopy,
  Bell,
  CreditCard,
  FileText,
  Mail,
  MessageSquareText,
  Settings2,
  Tags,
  Users,
} from "lucide-react";

import type {
  BusinessSettingsNavigationIcon,
  BusinessSettingsNavigationGroup,
} from "@/features/settings/navigation";
import { SettingsTabsNav } from "@/features/settings/components/settings-tabs-nav";

type BusinessSettingsNavProps = {
  groups: BusinessSettingsNavigationGroup[];
};

const settingsNavigationIcons: Record<BusinessSettingsNavigationIcon, typeof Settings2> = {
  general: Settings2,
  members: Users,
  notifications: Bell,
  replies: MessageSquareText,
  knowledge: BookCopy,
  quote: FileText,
  email: Mail,
  pricing: Tags,
  billing: CreditCard,
};

export function BusinessSettingsNav({ groups }: BusinessSettingsNavProps) {
  return (
    <SettingsTabsNav
      ariaLabel="Business settings"
      groups={groups}
      icons={settingsNavigationIcons}
    />
  );
}
