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
      <Card className="mx-auto w-full max-w-2xl shadow-[0_24px_80px_-40px_rgba(37,54,106,0.35)]">
        <CardHeader className="gap-5">
          <BrandMark />
          <div className="flex flex-col gap-2">
            <span className="eyebrow">Workspace required</span>
            <CardTitle className="text-3xl">
              We could not open your workspace yet.
            </CardTitle>
            <CardDescription className="max-w-xl text-sm leading-7">
              QuoteFlow only opens dashboard routes after an authenticated user
              has a workspace. We already retried workspace bootstrap for{" "}
              {user.email}, but the workspace context is still unavailable.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="rounded-2xl border bg-background/80 px-4 py-3 text-sm leading-6 text-muted-foreground">
            If this happened right after signup, a second request usually
            resolves it once the initial setup finishes.
          </div>
          <div className="rounded-2xl border bg-background/80 px-4 py-3 text-sm leading-6 text-muted-foreground">
            If the problem persists, sign out and log back in to restart the
            dashboard session cleanly.
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
