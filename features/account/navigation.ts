import {
  getAccountProfilePath,
  getAccountSecurityPath,
} from "@/features/account/routes";

export type AccountSettingsNavigationIcon = "profile" | "security";

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
      ],
    },
  ];
}
