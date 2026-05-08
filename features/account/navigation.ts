import {
  getAccountProfilePath,
  getAccountSecurityPath,
  getAccountBillingPath,
} from "@/features/account/routes";

export type AccountSettingsNavigationIcon = "profile" | "security" | "billing";

export type AccountSettingsNavigationItem = {
  href: string;
  label: string;
  icon: AccountSettingsNavigationIcon;
};

export type AccountSettingsNavigationGroup = {
  label: string;
  items: AccountSettingsNavigationItem[];
};

export function getAccountSettingsNavigation(): AccountSettingsNavigationGroup[] {
  return [
    {
      label: "Account",
      items: [
        {
          href: getAccountProfilePath(),
          label: "Profile",
          icon: "profile",
        },
        {
          href: getAccountSecurityPath(),
          label: "Security",
          icon: "security",
        },
        {
          href: getAccountBillingPath(),
          label: "Billing",
          icon: "billing",
        },
      ],
    },
  ];
}
