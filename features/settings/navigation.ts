import { getAccountProfilePath } from "@/features/account/routes";
import { getBusinessSettingsPath } from "@/features/businesses/routes";
import type { BusinessMemberRole } from "@/lib/business-members";
import {
  canManageBusinessAdministration,
  canManageOperationalBusinessSettings,
} from "@/lib/business-members";

export type BusinessSettingsNavigationIcon =
  | "general"
  | "members"
  | "notifications"
  | "replies"
  | "knowledge"
  | "quote"
  | "email"
  | "pricing"
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

  return "notifications" as const;
}

export function getDefaultBusinessSettingsPath(
  slug: string,
  role: BusinessMemberRole,
) {
  if (!canManageOperationalBusinessSettings(role)) {
    return getAccountProfilePath();
  }

  return getBusinessSettingsPath(slug, getDefaultBusinessSettingsSection(role));
}

export function getBusinessSettingsNavigation(
  slug: string,
  role: BusinessMemberRole,
): BusinessSettingsNavigationGroup[] {
  const groups: Array<BusinessSettingsNavigationGroup | null> = [
    canManageOperationalBusinessSettings(role)
      ? {
          label: "Business",
          items: [
            ...(canManageBusinessAdministration(role)
              ? [
                  {
                    href: getBusinessSettingsPath(slug, "general"),
                    label: "Profile",
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
              label: "Replies",
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
              label: "Quotes",
              icon: "quote" as const,
            },
            {
              href: getBusinessSettingsPath(slug, "email"),
              label: "Email",
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

  ];

  return groups.filter(
    (group): group is BusinessSettingsNavigationGroup => group !== null,
  );
}

/**
 * Returns the billing navigation group for workspace owners.
 * Billing is workspace-scoped but rendered within the business settings navigation.
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
          label: "Billing",
          icon: "billing" as const,
        },
      ],
    },
  ];
}
