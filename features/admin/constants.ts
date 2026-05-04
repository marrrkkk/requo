import {
  BarChart3,
  BriefcaseBusiness,
  FileClock,
  Gauge,
  Landmark,
  ListChecks,
  ReceiptText,
  ScrollText,
  Users,
  type LucideIcon,
} from "lucide-react";

export const adminPageSize = 20;

export type AdminNavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const adminNavigationItems: AdminNavigationItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: Gauge,
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: Users,
  },
  {
    href: "/admin/workspaces",
    label: "Workspaces",
    icon: Landmark,
  },
  {
    href: "/admin/businesses",
    label: "Businesses",
    icon: BriefcaseBusiness,
  },
  {
    href: "/admin/subscriptions",
    label: "Subscriptions",
    icon: ReceiptText,
  },
  {
    href: "/admin/deletion-requests",
    label: "Deletion Requests",
    icon: FileClock,
  },
  {
    href: "/admin/audit-logs",
    label: "Audit Logs",
    icon: ListChecks,
  },
  {
    href: "/admin/system",
    label: "System",
    icon: BarChart3,
  },
];

export const adminDetailAuditLimit = 10;
export const adminRecentListLimit = 5;

export const adminAuditLogMetadataPreviewKeys = [
  "reason",
  "workspaceName",
  "businessName",
  "userEmail",
  "subscriptionStatus",
  "scheduledDeletionAt",
] as const;

export const adminAuditLogPageDescription =
  "Review internal admin access and support actions. Sensitive detail views and all mutations are recorded here.";

export const adminSystemSectionIcon = ScrollText;
