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
            <Link href="/workspace">Open workspaces</Link>
          </Button>
        </>
      }
      description="The link may be outdated, the record may have been removed, or the URL may be incomplete."
      eyebrow="Page not found"
      title="That page does not exist."
    >
      <div className="state-card-note">
        Start from the homepage or return to your workspaces to continue working.
      </div>
    </StatePageCard>
  );
}
