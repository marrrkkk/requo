import type { LucideIcon } from "lucide-react";
import {
  BookCopy,
  FileText,
  MessageSquareText,
  Settings2,
  Tags,
  User,
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
      label: "Your Account",
      items: [
        {
          href: getBusinessSettingsPath(slug, "profile"),
          label: "Owner profile",
          description: "Name, avatar, and owner contact details",
          icon: User,
        },
      ],
    },
    {
      label: "Workspace Setup",
      items: [
        {
          href: getBusinessSettingsPath(slug, "general"),
          label: "Business details",
          description: "Business name, branding, contact, and defaults",
          icon: Settings2,
        },
      ],
    },
    {
      label: "Replies & Knowledge",
      items: [
        {
          href: getBusinessSettingsPath(slug, "replies"),
          label: "Reply snippets",
          description: "Reusable response templates for customer replies",
          icon: MessageSquareText,
        },
        {
          href: getBusinessSettingsPath(slug, "knowledge"),
          label: "Knowledge files",
          description: "Upload docs and FAQs used by AI drafting",
          icon: BookCopy,
        },
      ],
    },
    {
      label: "Quotes & Pricing",
      items: [
        {
          href: getBusinessSettingsPath(slug, "quote"),
          label: "Quote preferences",
          description: "Currency, validity window, and default quote copy",
          icon: FileText,
        },
        {
          href: getBusinessSettingsPath(slug, "pricing"),
          label: "Service pricing library",
          description: "Saved line items, pricing blocks, and packages",
          icon: Tags,
        },
      ],
    },
  ];
}
