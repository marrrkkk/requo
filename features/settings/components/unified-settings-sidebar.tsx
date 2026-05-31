"use client";

import {
  Bell,
  BookOpen,
  Building2,
  CreditCard,
  FileText,
  Mail,
  Palette,
  Plug,
  Receipt,
  ScrollText,
  Tag,
  User,
  Users,
} from "lucide-react";

import type { SettingsNavigationGroup } from "@/features/settings/navigation";
import { SettingsSidebarNav } from "@/features/settings/components/settings-sidebar-nav";

type UnifiedSettingsSidebarProps = {
  groups: SettingsNavigationGroup[];
};

const unifiedSettingsIcons: Record<string, typeof User> = {
  user: User,
  palette: Palette,
  bell: Bell,
  building: Building2,
  users: Users,
  "credit-card": CreditCard,
  receipt: Receipt,
  "file-text": FileText,
  mail: Mail,
  tag: Tag,
  book: BookOpen,
  plug: Plug,
  scroll: ScrollText,
};

export function UnifiedSettingsSidebar({ groups }: UnifiedSettingsSidebarProps) {
  return (
    <SettingsSidebarNav
      ariaLabel="Settings"
      groups={groups}
      icons={unifiedSettingsIcons}
    />
  );
}
