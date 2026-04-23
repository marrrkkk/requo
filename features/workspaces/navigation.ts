import { getWorkspaceSettingsPath } from "@/features/workspaces/routes";

export type WorkspaceSettingsNavigationIcon =
  | "general"
  | "billing"
  | "audit"
  | "members";

export type WorkspaceSettingsNavigationItem = {
  href: string;
  label: string;
  icon: WorkspaceSettingsNavigationIcon;
};

export type WorkspaceSettingsNavigationGroup = {
  label: string;
  items: WorkspaceSettingsNavigationItem[];
};



export function getWorkspaceSettingsNavigation(
  workspaceSlug: string,
): WorkspaceSettingsNavigationGroup[] {
  return [
    {
      label: "Workspace",
      items: [
        {
          href: getWorkspaceSettingsPath(workspaceSlug, "general"),
          label: "General",
          icon: "general",
        },
        {
          href: getWorkspaceSettingsPath(workspaceSlug, "members"),
          label: "Members",
          icon: "members",
        },
        {
          href: getWorkspaceSettingsPath(workspaceSlug, "billing"),
          label: "Billing",
          icon: "billing",
        },
        {
          href: getWorkspaceSettingsPath(workspaceSlug, "audit-log"),
          label: "Audit Log",
          icon: "audit",
        },
      ],
    },
  ];
}
