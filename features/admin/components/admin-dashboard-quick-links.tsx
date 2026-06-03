import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  Briefcase,
  CreditCard,
  ScrollText,
  Users,
} from "lucide-react";

import {
  ADMIN_AUDIT_LOGS_PATH,
  ADMIN_BUSINESSES_PATH,
  ADMIN_SUBSCRIPTIONS_PATH,
  ADMIN_SYSTEM_PATH,
  ADMIN_USERS_PATH,
} from "@/features/admin/navigation";
import { cn } from "@/lib/utils";

const quickLinks: Array<{
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    href: ADMIN_USERS_PATH,
    label: "Manage users",
    description: "Search, inspect, and run support actions.",
    icon: Users,
  },
  {
    href: ADMIN_BUSINESSES_PATH,
    label: "Review businesses",
    description: "Read-only view of customer workspaces.",
    icon: Briefcase,
  },
  {
    href: ADMIN_SUBSCRIPTIONS_PATH,
    label: "Subscriptions",
    description: "Inspect billing state and plan overrides.",
    icon: CreditCard,
  },
  {
    href: ADMIN_SYSTEM_PATH,
    label: "System health",
    description: "Integration checks and environment config.",
    icon: Activity,
  },
  {
    href: ADMIN_AUDIT_LOGS_PATH,
    label: "Audit log",
    description: "Every admin view and action, newest first.",
    icon: ScrollText,
  },
];

/**
 * Admin quick-access grid — action-oriented links to admin workflows.
 *
 * Uses `soft-panel` for a subtler surface than the stat cards, creating
 * visual hierarchy: health banner > stat cards > quick links.
 */
export function AdminDashboardQuickLinks() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {quickLinks.map((item) => {
        const Icon = item.icon;

        return (
          <Link
            className={cn(
              "group soft-panel flex items-start gap-4 px-4 py-4",
              "transition-[border-color,box-shadow]",
              "[transition-duration:var(--motion-duration-fast)]",
              "hover:border-primary/20 hover:shadow-[var(--surface-shadow-md)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            href={item.href}
            key={item.href}
            prefetch={true}
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-accent/60 text-muted-foreground transition-colors group-hover:border-primary/20 group-hover:text-primary dark:bg-accent">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <ArrowRight
                  aria-hidden
                  className="size-3 text-muted-foreground/0 transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-primary"
                />
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {item.description}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
