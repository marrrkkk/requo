import Link from "next/link";

import { DashboardTableContainer } from "@/components/shared/dashboard-layout";
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
import { getAdminUserDetailPath } from "@/features/admin/navigation";
import type { AdminUserRow } from "@/features/admin/types";

type AdminUsersTableProps = {
  users: AdminUserRow[];
};

/** Short, repo-consistent date formatter for table cells. */
const tableDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatTableDate(value: Date | null): string {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return tableDateFormatter.format(date);
}

/**
 * Admin users list table (task 12.2).
 *
 * Columns: Email, Name, Email verified, Suspended badge, Created,
 * Last session. Matches `AdminUserRow` from `features/admin/types.ts`
 * and the design doc's list columns (email, name, emailVerified,
 * suspended, createdAt, lastSessionAt). Default ordering is
 * `createdAt desc` (Req 3.4); the caption surfaces that so screen
 * readers announce the ordering too.
 *
 * Reuses the shared `DashboardTableContainer` + `Table` wrappers per
 * DESIGN.md. No new visual primitives.
 */
export function AdminUsersTable({ users }: AdminUsersTableProps) {
  return (
    <DashboardTableContainer>
      <Table className="min-w-[60rem] table-fixed">
        <TableCaption className="sr-only">
          Newest users appear first.
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[18rem]">Email</TableHead>
            <TableHead className="w-[14rem]">Name</TableHead>
            <TableHead className="w-[8rem]">Email verified</TableHead>
            <TableHead className="w-[8rem]">Suspended</TableHead>
            <TableHead className="w-[8rem]">Created</TableHead>
            <TableHead className="w-[10rem]">Last session</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const href = getAdminUserDetailPath(user.id);

            return (
              <TableRow className="group/row" key={user.id}>
                <TableCell className="w-[18rem]">
                  <TruncatedTextWithTooltip
                    className="table-link"
                    href={href}
                    prefetch={true}
                    text={user.email}
                  />
                </TableCell>
                <TableCell className="w-[14rem]">
                  <TruncatedTextWithTooltip
                    className="table-emphasis"
                    href={href}
                    prefetch={true}
                    text={user.name || "—"}
                  />
                </TableCell>
                <TableCell className="w-[8rem]">
                  <Link
                    className="inline-flex max-w-full"
                    href={href}
                    prefetch={true}
                  >
                    {user.emailVerified ? (
                      <Badge variant="secondary">Verified</Badge>
                    ) : (
                      <Badge variant="ghost">Unverified</Badge>
                    )}
                  </Link>
                </TableCell>
                <TableCell className="w-[8rem]">
                  <Link
                    className="inline-flex max-w-full"
                    href={href}
                    prefetch={true}
                  >
                    {user.banned ? (
                      <Badge variant="destructive">Suspended</Badge>
                    ) : (
                      <Badge variant="ghost">Active</Badge>
                    )}
                  </Link>
                </TableCell>
                <TableCell className="w-[8rem]">
                  <Link
                    className="block text-sm text-muted-foreground transition-colors hover:text-primary group-hover/row:text-primary"
                    href={href}
                    prefetch={true}
                  >
                    {formatTableDate(user.createdAt)}
                  </Link>
                </TableCell>
                <TableCell className="w-[10rem]">
                  <Link
                    className="block text-sm text-muted-foreground transition-colors hover:text-primary group-hover/row:text-primary"
                    href={href}
                    prefetch={true}
                  >
                    {formatTableDate(user.lastSessionAt)}
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </DashboardTableContainer>
  );
}
