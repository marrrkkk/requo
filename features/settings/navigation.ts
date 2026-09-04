import { getBusinessSettingsPath } from "@/features/businesses/routes";
import type { BusinessMemberRole } from "@/lib/business-members";
import {
  canManageBusinessAdministration,
  canManageOperationalBusinessSettings,
} from "@/lib/business-members";

// --- Unified Settings Navigation (Requirements 4.2, 4.3) ---

export type SettingsNavigationItem = {
  href: string;
  label: string;
  icon: string;
};

export type SettingsNavigationGroup = {
  label: string;
  items: SettingsNavigationItem[];
};

export function getUnifiedSettingsNavigation(
  slug: string,
): SettingsNavigationGroup[] {
  return [
    {
      label: "Personal",
      items: [
        { href: `/${slug}/settings/profile`, label: "Profile", icon: "user" },
        {
          href: `/${slug}/settings/appearance`,
          label: "Appearance",
          icon: "palette",
        },
        {
          href: `/${slug}/settings/notifications`,
          label: "Notifications",
          icon: "bell",
        },
      ],
    },
    {
      label: "Business",
      items: [
        {
          href: `/${slug}/settings/general`,
          label: "Profile",
          icon: "building",
        },
        {
          href: `/${slug}/settings/quote`,
          label: "Quotes",
          icon: "file-text",
        },
        {
          href: `/${slug}/settings/quote-templates`,
          label: "Templates",
          icon: "tag",
        },
        {
          href: `/${slug}/settings/email`,
          label: "Email templates",
          icon: "mail",
        },
        {
          href: `/${slug}/settings/ai`,
          label: "Assistant",
          icon: "astroid",
        },
        {
          href: `/${slug}/settings/knowledge-base`,
          label: "Knowledge base",
          icon: "book",
        },
      ],
    },
    {
      label: "Account",
      items: [
        {
          href: `/${slug}/settings/billing`,
          label: "Billing",
          icon: "receipt",
        },
        {
          href: `/${slug}/settings/audit-log`,
          label: "Audit log",
          icon: "scroll",
        },
      ],
    },
  ];
}

export type BusinessSettingsNavigationIcon =
  | "general"
  | "members"
  | "notifications"
  | "quote"
  | "email"
  | "pricing"
  | "billing"
  | "audit-log";

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
  // Owners land on Business › Profile (general); staff land on Personal › Profile.
  if (canManageBusinessAdministration(role)) {
    return getBusinessSettingsPath(slug, "general");
  }

  return getBusinessSettingsPath(slug, "profile");
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
          ],
        }
      : null,

  ];

  return groups.filter(
    (group): group is BusinessSettingsNavigationGroup => group !== null,
  );
}

/**
 * Returns the billing navigation group for business owners.
 * Billing is rendered within the business settings navigation.
 */
export function getWorkspaceSettingsNavigation(
  businessSlug: string,
  role: BusinessMemberRole,
): BusinessSettingsNavigationGroup[] {
  if (!canManageOperationalBusinessSettings(role)) {
    return [];
  }

  const items: BusinessSettingsNavigationItem[] = [];

  items.push({
    href: getBusinessSettingsPath(businessSlug, "audit-log"),
    label: "Audit log",
    icon: "audit-log" as const,
  });

  if (canManageBusinessAdministration(role)) {
    items.push({
      href: getBusinessSettingsPath(businessSlug, "billing"),
      label: "Billing",
      icon: "billing" as const,
    });
  }

  return [
    {
      label: "Account",
      items,
    },
  ];
}
