import type { LucideIcon } from "lucide-react";
import {
  BookCopy,
  FileText,
  Globe,
  Settings2,
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
      description: "Identity, writing defaults, and notification preferences.",
      icon: Settings2,
    },
    {
      href: getWorkspaceSettingsPath(slug, "inquiry-page"),
      label: "Inquiry page",
      description: "Customize the public inquiry page layout, copy, branding, and cards.",
      icon: Globe,
    },
    {
      href: getWorkspaceSettingsPath(slug, "pricing-library"),
      label: "Pricing library",
      description: "Reusable pricing blocks and service packages for quotes.",
      icon: FileText,
    },
    {
      href: getWorkspaceSettingsPath(slug, "knowledge"),
      label: "Knowledge",
      description: "Files and FAQs the workspace can reuse in drafts.",
      icon: BookCopy,
    },
  ];
}
