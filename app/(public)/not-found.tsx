import Link from "next/link";

import { StatePageCard } from "@/components/shared/state-page-card";
import { Button } from "@/components/ui/button";

export default function PublicNotFound() {
  return (
    <StatePageCard
      actions={
        <>
          <Button asChild variant="outline">
            <Link href="/">Back to Relay</Link>
          </Button>
        </>
      }
      eyebrow="Unavailable link"
      title="This public page is unavailable."
    >
      <div className="state-card-note">
        Ask the business owner for a new link.
      </div>
    </StatePageCard>
  );
}
