import type { LucideIcon } from "lucide-react";
import {
  BookCopy,
  FileText,
  MessageSquareText,
  Settings2,
  Tags,
} from "lucide-react";

import { getBusinessSettingsPath } from "@/features/businesses/routes";

export type BusinessSettingsNavigationItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export type BusinessSettingsNavigationGroup = {
  label: string;
  items: BusinessSettingsNavigationItem[];
};

export function getBusinessSettingsNavigation(
  slug: string,
): BusinessSettingsNavigationGroup[] {
  return [
    {
      label: "Business",
      items: [
        {
          href: getBusinessSettingsPath(slug, "general"),
          label: "General",
          description: "Brand, contact, notifications",
          icon: Settings2,
        },
      ],
    },
    {
      label: "Responses",
      items: [
        {
          href: getBusinessSettingsPath(slug, "replies"),
          label: "Saved replies",
          description: "Reusable snippets for inquiry responses",
          icon: MessageSquareText,
        },
        {
          href: getBusinessSettingsPath(slug, "knowledge"),
          label: "Knowledge base",
          description: "Files and FAQs for AI context",
          icon: BookCopy,
        },
      ],
    },
    {
      label: "Quotes",
      items: [
        {
          href: getBusinessSettingsPath(slug, "quote"),
          label: "Quote defaults",
          description: "Currency, validity, and default copy",
          icon: FileText,
        },
        {
          href: getBusinessSettingsPath(slug, "pricing"),
          label: "Pricing library",
          description: "Saved blocks and service packages",
          icon: Tags,
        },
      ],
    },
  ];
}
