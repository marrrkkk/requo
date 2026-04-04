import type { LucideIcon } from "lucide-react";
import {
  BookCopy,
  FileText,
  FormInput,
  Settings2,
  Tags,
} from "lucide-react";

import { getWorkspaceSettingsPath } from "@/features/workspaces/routes";

export type WorkspaceSectionNavigationItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export function getWorkspaceSectionNavigation(
  slug: string,
): WorkspaceSectionNavigationItem[] {
  return [
    {
      href: getWorkspaceSettingsPath(slug, "general"),
      label: "General",
      description: "Brand, contact, notifications",
      icon: Settings2,
    },
    {
      href: getWorkspaceSettingsPath(slug, "inquiry"),
      label: "Inquiry",
      description: "Forms, URLs, reply snippets",
      icon: FormInput,
    },
    {
      href: getWorkspaceSettingsPath(slug, "quote"),
      label: "Quote",
      description: "Defaults, template, validity",
      icon: FileText,
    },
    {
      href: getWorkspaceSettingsPath(slug, "pricing"),
      label: "Pricing",
      description: "Saved blocks and packages",
      icon: Tags,
    },
    {
      href: getWorkspaceSettingsPath(slug, "knowledge"),
      label: "Knowledge",
      description: "Files and FAQs",
      icon: BookCopy,
    },
  ];
}
