import type { LucideIcon } from "lucide-react";
import {
  BookCopy,
  FileText,
  Settings2,
} from "lucide-react";

export type WorkspaceSectionNavigationItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const workspaceSectionNavigation: WorkspaceSectionNavigationItem[] = [
  {
    href: "/dashboard/settings/general",
    label: "General",
    description: "Identity, public form defaults, messaging, and notifications.",
    icon: Settings2,
  },
  {
    href: "/dashboard/settings/pricing-library",
    label: "Pricing library",
    description: "Reusable pricing blocks and service packages for quotes.",
    icon: FileText,
  },
  {
    href: "/dashboard/settings/knowledge",
    label: "Knowledge",
    description: "Files and FAQs the workspace can reuse in drafts.",
    icon: BookCopy,
  },
];
