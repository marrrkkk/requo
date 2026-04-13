import Link from "next/link";

import { StatePageCard } from "@/components/shared/state-page-card";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <StatePageCard
      actions={
        <>
          <Button asChild variant="outline">
            <Link href="/">Go home</Link>
          </Button>
          <Button asChild>
            <Link href="/workspaces">Open workspaces</Link>
          </Button>
        </>
      }
      eyebrow="Page not found"
      title="That page does not exist."
    >
      <div className="state-card-note">
        Go home or open your workspaces.
      </div>
    </StatePageCard>
  );
}
