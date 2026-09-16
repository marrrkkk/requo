import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { DashboardSection } from "@/components/shared/dashboard-layout";
import { Button } from "@/components/ui/button";
import {
  ADMIN_AI_PATH,
  ADMIN_AUDIT_LOGS_PATH,
  ADMIN_BUSINESSES_PATH,
  ADMIN_EMAILS_PATH,
  ADMIN_INQUIRIES_PATH,
  ADMIN_QUOTES_PATH,
  ADMIN_SYSTEM_PATH,
  ADMIN_USAGE_PATH,
  ADMIN_USERS_PATH,
} from "@/features/admin/navigation";

const QUICK_LINKS = [
  { label: "Businesses", href: ADMIN_BUSINESSES_PATH },
  { label: "Users", href: ADMIN_USERS_PATH },
  { label: "Inquiries", href: ADMIN_INQUIRIES_PATH },
  { label: "Quotes", href: ADMIN_QUOTES_PATH },
  { label: "AI overview", href: ADMIN_AI_PATH },
  { label: "Emails", href: ADMIN_EMAILS_PATH },
  { label: "Usage", href: ADMIN_USAGE_PATH },
  { label: "Audit logs", href: ADMIN_AUDIT_LOGS_PATH },
  { label: "System", href: ADMIN_SYSTEM_PATH },
] as const;

/**
 * Quick links rail for the admin Overview.
 *
 * Sits under "Needs attention" so the right rail has substance next to the
 * tall activity feed — paired columns of similar weight instead of one
 * short card beside a long one.
 */
export function AdminQuickLinks() {
  return (
    <DashboardSection
      description="Jump to any console area."
      title="Quick links"
    >
      <div className="flex flex-col gap-2">
        {QUICK_LINKS.map((link) => (
          <Button
            asChild
            className="justify-start"
            key={link.href}
            size="sm"
            variant="outline"
          >
            <Link href={link.href} prefetch={true}>
              {link.label}
              <ArrowRight className="ml-auto" data-icon="inline-end" />
            </Link>
          </Button>
        ))}
      </div>
    </DashboardSection>
  );
}
