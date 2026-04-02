import Link from "next/link";
import { ReactNode } from "react";

import { LogoutButton } from "@/features/auth/components/logout-button";
import type { AuthUser } from "@/lib/auth/session";
import type { WorkspaceContext } from "@/lib/db/workspace-access";
import { BrandMark } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const navigation = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/inquiries", label: "Inquiries" },
  { href: "/dashboard/quotes", label: "Quotes" },
  { href: "/dashboard/knowledge", label: "Knowledge" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/settings", label: "Settings" },
];

type DashboardShellProps = {
  children: ReactNode;
  user: AuthUser;
  workspace: WorkspaceContext["workspace"];
};

export function DashboardShell({
  children,
  user,
  workspace,
}: DashboardShellProps) {
  return (
    <div className="page-wrap py-6 lg:py-8">
      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader className="gap-6">
            <BrandMark />
            <div className="space-y-3">
              <span className="eyebrow">{workspace.slug}</span>
              <CardTitle className="text-2xl">{workspace.name}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {navigation.map((item) => (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                className="justify-start"
              >
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-3">
            <Separator />
            <div className="flex flex-col gap-1 text-sm">
              <p className="font-medium text-foreground">{user.name}</p>
              <p className="truncate text-muted-foreground">{user.email}</p>
              <p className="text-muted-foreground">
                Currency: {workspace.defaultCurrency}
              </p>
            </div>
            <LogoutButton />
          </CardFooter>
        </Card>

        <div className="flex min-w-0 flex-col gap-6">{children}</div>
      </div>
    </div>
  );
}
