import Link from "next/link";

import { StatePageCard } from "@/components/shared/state-page-card";
import { Button } from "@/components/ui/button";
import { businessesHubPath } from "@/features/businesses/routes";

export default function NotFound() {
  return (
    <StatePageCard
      actions={
        <>
          <Button asChild variant="outline">
            <Link href="/">Go home</Link>
          </Button>
          <Button asChild>
            <Link href={businessesHubPath}>Open businesses</Link>
          </Button>
        </>
      }
      eyebrow="Page not found"
      title="That page does not exist."
    >
      <div className="state-card-note">
        Go home or open your businesses.
      </div>
    </StatePageCard>
  );
}
