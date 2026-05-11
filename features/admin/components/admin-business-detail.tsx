import Link from "next/link";

import {
  DashboardDetailHeader,
  DashboardDetailLayout,
  DashboardMetaPill,
  DashboardSection,
  DashboardSidebarStack,
  DashboardTableContainer,
} from "@/components/shared/dashboard-layout";
import { TruncatedTextWithTooltip } from "@/components/shared/truncated-text-with-tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ADMIN_BUSINESSES_PATH,
  getAdminUserDetailPath,
} from "@/features/admin/navigation";
import type { AdminBusinessDetail } from "@/features/admin/types";
import { businessMemberRoleMeta } from "@/lib/business-members";
import { planMeta, type BusinessPlan } from "@/lib/plans";

/**
 * Read-only admin detail view for a business (Requirements 5.3, 5.4).
 *
 * Per Requirement 5.4, v1 intentionally renders no mutation affordances.
 * Everything here is passive: identity, owner summary, denormalized plan,
 * member roster, activity counts, and last activity timestamps. Passive
 * information clusters use `soft-panel` + `meta-label` per DESIGN.md.
 */
export function AdminBusinessDetail({
  detail,
}: {
  detail: AdminBusinessDetail;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <DashboardDetailHeader
        eyebrow={
          <Link
            className="underline-offset-4 hover:text-primary hover:underline"
            href={ADMIN_BUSINESSES_PATH}
          >
            ← Businesses
          </Link>
        }
        meta={
          <>
            <DashboardMetaPill>/{detail.slug}</DashboardMetaPill>
            <DashboardMetaPill>
              <AdminBusinessPlanBadge plan={detail.plan} />
            </DashboardMetaPill>
            <DashboardMetaPill>
              {detail.memberCount.toLocaleString()}{" "}
              {detail.memberCount === 1 ? "member" : "members"}
            </DashboardMetaPill>
            <DashboardMetaPill>
              Created {formatAdminDate(detail.createdAt)}
            </DashboardMetaPill>
            {detail.archivedAt ? (
              <DashboardMetaPill>
                Archived {formatAdminDate(detail.archivedAt)}
              </DashboardMetaPill>
            ) : null}
            {detail.deletedAt ? (
              <DashboardMetaPill>
                Deleted {formatAdminDate(detail.deletedAt)}
              </DashboardMetaPill>
            ) : null}
          </>
        }
        title={detail.name}
      />

      <DashboardDetailLayout className="xl:grid-cols-[minmax(0,1.1fr)_0.9fr]">
        <div className="flex min-w-0 flex-col gap-6">
          <DashboardSection
            description="Read-only snapshot of the business identity and plan cache."
            title="Business"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminDetailField label="Name" value={detail.name} />
              <AdminDetailField label="Slug" value={detail.slug} />
              <AdminDetailField label="Business id" value={detail.id} />
              <AdminDetailField
                label="Plan (cached)"
                value={planMeta[detail.plan].label}
              />
              <AdminDetailField
                label="Created"
                value={formatAdminDateTime(detail.createdAt)}
              />
              <AdminDetailField
                label="Updated"
                value={formatAdminDateTime(detail.updatedAt)}
              />
            </div>
          </DashboardSection>

          <DashboardSection
            description={`${detail.memberCount.toLocaleString()} ${
              detail.memberCount === 1 ? "person has" : "people have"
            } access to this business.`}
            title="Members"
          >
            {detail.members.length === 0 ? (
              <div className="soft-panel px-5 py-6 shadow-none">
                <p className="meta-label">Members</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  No members have been invited yet.
                </p>
              </div>
            ) : (
              <DashboardTableContainer innerClassName="border-border/60">
                <Table className="min-w-[40rem]">
                  <TableCaption className="sr-only">
                    Business members sorted by join date.
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead className="w-[9rem]">Role</TableHead>
                      <TableHead className="w-[10rem]">Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.members.map((member) => {
                      const userHref = getAdminUserDetailPath(member.userId);
                      const roleLabel =
                        businessMemberRoleMeta[member.role].label;

                      return (
                        <TableRow key={member.userId}>
                          <TableCell>
                            <div className="table-meta-stack max-w-full">
                              <TruncatedTextWithTooltip
                                className="table-link"
                                href={userHref}
                                prefetch={true}
                                text={member.name}
                              />
                              <TruncatedTextWithTooltip
                                className="table-supporting-text"
                                href={userHref}
                                prefetch={true}
                                text={member.email}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="w-[9rem]">
                            <Badge variant="outline">{roleLabel}</Badge>
                          </TableCell>
                          <TableCell className="w-[10rem] text-sm text-muted-foreground">
                            {formatAdminDate(member.joinedAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </DashboardTableContainer>
            )}
          </DashboardSection>
        </div>

        <DashboardSidebarStack>
          <DashboardSection title="Owner">
            <div className="flex flex-col gap-3">
              <AdminDetailField label="Name" value={detail.ownerName} />
              <AdminDetailField label="Email" value={detail.ownerEmail} />
              <AdminDetailField label="User id" value={detail.ownerUserId} />
              <Link
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                href={getAdminUserDetailPath(detail.ownerUserId)}
              >
                View owner in admin →
              </Link>
            </div>
          </DashboardSection>

          <DashboardSection title="Activity">
            <div className="flex flex-col gap-3">
              <AdminDetailField
                label="Inquiries"
                value={detail.inquiryCount.toLocaleString()}
              />
              <AdminDetailField
                label="Quotes"
                value={detail.quoteCount.toLocaleString()}
              />
              <AdminDetailField
                label="Last inquiry"
                value={
                  detail.lastInquiryAt
                    ? formatAdminDateTime(detail.lastInquiryAt)
                    : "No inquiries yet"
                }
              />
              <AdminDetailField
                label="Last quote sent"
                value={
                  detail.lastQuoteSentAt
                    ? formatAdminDateTime(detail.lastQuoteSentAt)
                    : "No quotes sent yet"
                }
              />
            </div>
          </DashboardSection>
        </DashboardSidebarStack>
      </DashboardDetailLayout>
    </div>
  );
}

function AdminBusinessPlanBadge({ plan }: { plan: BusinessPlan }) {
  return (
    <Badge variant={plan === "free" ? "outline" : "secondary"}>
      {planMeta[plan].label}
    </Badge>
  );
}

function AdminDetailField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="soft-panel px-4 py-3 shadow-none">
      <p className="meta-label">{label}</p>
      <p className="mt-1.5 text-sm font-medium text-foreground break-words">
        {value}
      </p>
    </div>
  );
}

function formatAdminDate(value: Date) {
  return value.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatAdminDateTime(value: Date) {
  return value.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
