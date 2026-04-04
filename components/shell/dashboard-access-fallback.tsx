import Link from "next/link";

import { LogoutButton } from "@/features/auth/components/logout-button";
import { StatePageCard } from "@/components/shared/state-page-card";
import { Button } from "@/components/ui/button";

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
    <StatePageCard
      actions={
        <>
          <Button asChild>
            <Link href="/workspace">Open workspaces</Link>
          </Button>
          <LogoutButton variant="ghost" />
        </>
      }
      description={`We retried workspace setup for ${user.email}, but the dashboard context is still unavailable.`}
      eyebrow="Workspace required"
      title="Workspace not ready yet."
    >
      <div className="state-card-note">
        Open the workspace hub to create or select a workspace first.
      </div>
      <div className="state-card-note">
        If it keeps failing, sign out and back in to restart the session
        cleanly.
      </div>
    </StatePageCard>
  );
}
