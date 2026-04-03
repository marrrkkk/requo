import Link from "next/link";

import { LogoutButton } from "@/features/auth/components/logout-button";
import { BrandMark } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type DashboardAccessFallbackProps = {
  user: {
    email: string;
    name: string;
  };
};

export function DashboardAccessFallback({
  user,
}: DashboardAccessFallbackProps) {
  return (
    <div className="page-wrap flex min-h-screen items-center py-10">
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader className="gap-5">
          <BrandMark />
          <div className="flex flex-col gap-2">
            <span className="eyebrow">Workspace required</span>
            <CardTitle className="text-3xl">
              Workspace not ready yet.
            </CardTitle>
            <CardDescription className="max-w-xl text-sm leading-7">
              We retried workspace setup for {user.email}, but the dashboard context is still unavailable.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="rounded-xl border border-border/80 bg-background px-4 py-3 text-sm leading-6 text-muted-foreground">
            If this happened just after signup, waiting a moment and trying again usually fixes it.
          </div>
          <div className="rounded-xl border border-border/80 bg-background px-4 py-3 text-sm leading-6 text-muted-foreground">
            If it keeps failing, sign out and back in to restart the session cleanly.
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-end">
          <Button asChild>
            <Link href="/dashboard">Try dashboard again</Link>
          </Button>
          <LogoutButton variant="ghost" />
        </CardFooter>
      </Card>
    </div>
  );
}
