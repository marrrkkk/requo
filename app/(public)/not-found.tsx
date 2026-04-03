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
      description="The inquiry or quote link may be incorrect, expired, or no longer shared by the business."
      eyebrow="Unavailable link"
      title="This public page is unavailable."
    >
      <div className="state-card-note">
        If you were expecting access, contact the business owner and ask for a
        fresh link.
      </div>
    </StatePageCard>
  );
}
