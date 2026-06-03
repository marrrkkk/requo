import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { getAdminUserDetailPath } from "@/features/admin/navigation";
import type { AdminUserRow } from "@/features/admin/types";

type AdminUsersListCardsProps = {
  users: AdminUserRow[];
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function AdminUsersListCards({ users }: AdminUsersListCardsProps) {
  return (
    <div className="data-list-mobile-grid xl:hidden">
      {users.map((user) => {
        const href = getAdminUserDetailPath(user.id);

        return (
          <Link
            className="data-list-card group"
            href={href}
            key={user.id}
            prefetch={true}
          >
            <div className="flex flex-col gap-2">
              <p className="font-medium text-foreground group-hover:text-primary">
                {user.email}
              </p>
              <p className="text-sm text-muted-foreground">
                {user.name || "No name"}
              </p>
              <div className="flex flex-wrap gap-2">
                {user.emailVerified ? (
                  <Badge variant="secondary">Verified</Badge>
                ) : (
                  <Badge variant="ghost">Unverified</Badge>
                )}
                {user.banned ? (
                  <Badge variant="destructive">Suspended</Badge>
                ) : (
                  <Badge variant="ghost">Active</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Created {dateFormatter.format(user.createdAt)}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
