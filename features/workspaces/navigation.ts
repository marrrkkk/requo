import { getWorkspaceSettingsPath } from "@/features/workspaces/routes";

export type WorkspaceSettingsNavigationIcon =
  | "general"
  | "billing"
  | "audit";

export type WorkspaceSettingsNavigationItem = {
  href: string;
  label: string;
  icon: WorkspaceSettingsNavigationIcon;
};

export type WorkspaceSettingsNavigationGroup = {
  label: string;
  items: WorkspaceSettingsNavigationItem[];
};

export function getDefaultWorkspaceSettingsSection() {
  return "general" as const;
}

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
