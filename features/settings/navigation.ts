import { getBusinessSettingsPath } from "@/features/businesses/routes";

export type BusinessSettingsNavigationIcon =
  | "profile"
  | "security"
  | "general"
  | "notifications"
  | "replies"
  | "knowledge"
  | "quote"
  | "pricing";

export type BusinessSettingsNavigationItem = {
  href: string;
  label: string;
  icon: BusinessSettingsNavigationIcon;
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
      label: "Account",
      items: [
        {
          href: getBusinessSettingsPath(slug, "profile"),
          label: "Your profile",
          icon: "profile",
        },
        {
          href: getBusinessSettingsPath(slug, "security"),
          label: "Security",
          icon: "security",
        },
      ],
    },
    {
      label: "Business",
      items: [
        {
          href: getBusinessSettingsPath(slug, "general"),
          label: "Business profile",
          icon: "general",
        },
        {
          href: getBusinessSettingsPath(slug, "notifications"),
          label: "Notifications",
          icon: "notifications",
        },
      ],
    },
    {
      label: "Responses",
      items: [
        {
          href: getBusinessSettingsPath(slug, "replies"),
          label: "Saved replies",
          icon: "replies",
        },
        {
          href: getBusinessSettingsPath(slug, "knowledge"),
          label: "Knowledge base",
          icon: "knowledge",
        },
      ],
    },
    {
      label: "Quotes",
      items: [
        {
          href: getBusinessSettingsPath(slug, "quote"),
          label: "Quote defaults",
          icon: "quote",
        },
        {
          href: getBusinessSettingsPath(slug, "pricing"),
          label: "Pricing library",
          icon: "pricing",
        },
      ],
    },
  ];
}
