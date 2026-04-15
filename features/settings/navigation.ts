import { getBusinessSettingsPath } from "@/features/businesses/routes";
import type { BusinessMemberRole } from "@/lib/business-members";
import {
  canManageBusinessAdministration,
  canManageOperationalBusinessSettings,
} from "@/lib/business-members";

export type BusinessSettingsNavigationIcon =
  | "profile"
  | "security"
  | "general"
  | "members"
  | "notifications"
  | "replies"
  | "knowledge"
  | "quote"
  | "email"
  | "pricing"
  | "integrations"
  | "billing";

export type BusinessSettingsNavigationItem = {
  href: string;
  label: string;
  icon: BusinessSettingsNavigationIcon;
};

export type BusinessSettingsNavigationGroup = {
  label: string;
  items: BusinessSettingsNavigationItem[];
};

export function getDefaultBusinessSettingsSection(role: BusinessMemberRole) {
  if (canManageBusinessAdministration(role)) {
    return "general" as const;
  }

  if (canManageOperationalBusinessSettings(role)) {
    return "notifications" as const;
  }

  return "profile" as const;
}

export function getDefaultBusinessSettingsPath(
  slug: string,
  role: BusinessMemberRole,
) {
  return getBusinessSettingsPath(slug, getDefaultBusinessSettingsSection(role));
}

export function getBusinessSettingsNavigation(
  slug: string,
  role: BusinessMemberRole,
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
    canManageOperationalBusinessSettings(role)
      ? {
          label: "Business",
          items: [
            ...(canManageBusinessAdministration(role)
              ? [
                  {
                    href: getBusinessSettingsPath(slug, "general"),
                    label: "Business profile",
                    icon: "general" as const,
                  },
                ]
              : []),
            {
              href: getBusinessSettingsPath(slug, "notifications"),
              label: "Notifications",
              icon: "notifications" as const,
            },
          ],
        }
      : null,
    canManageOperationalBusinessSettings(role)
      ? {
          label: "Responses",
          items: [
            {
              href: getBusinessSettingsPath(slug, "replies"),
              label: "Saved replies",
              icon: "replies" as const,
            },
            {
              href: getBusinessSettingsPath(slug, "knowledge"),
              label: "Knowledge",
              icon: "knowledge" as const,
            },
          ],
        }
      : null,
    canManageOperationalBusinessSettings(role)
      ? {
          label: "Quotes",
          items: [
            {
              href: getBusinessSettingsPath(slug, "quote"),
              label: "Quote defaults",
              icon: "quote" as const,
            },
            {
              href: getBusinessSettingsPath(slug, "email"),
              label: "Email templates",
              icon: "email" as const,
            },
            {
              href: getBusinessSettingsPath(slug, "pricing"),
              label: "Pricing",
              icon: "pricing" as const,
            },
          ],
        }
      : null,
    {
      label: "Integrations",
      items: [
        {
          href: getBusinessSettingsPath(slug, "integrations"),
          label: "Google Calendar",
          icon: "integrations" as const,
        },
      ],
    },
  ].filter((group): group is BusinessSettingsNavigationGroup => Boolean(group));
}

/**
 * Returns the billing navigation group for workspace owners.
 * Billing is workspace-scoped but rendered within the business settings sidebar.
 */
export function getWorkspaceSettingsNavigation(
  businessSlug: string,
  role: BusinessMemberRole,
): BusinessSettingsNavigationGroup[] {
  if (!canManageBusinessAdministration(role)) {
    return [];
  }

  return [
    {
      label: "Workspace",
      items: [
        {
          href: getBusinessSettingsPath(businessSlug, "billing"),
          label: "Plan & billing",
          icon: "billing" as const,
        },
      ],
    },
  ];
}
