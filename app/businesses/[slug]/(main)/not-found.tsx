import Link from "next/link";
import { SearchX } from "lucide-react";

import { StatePageCard } from "@/components/shared/state-page-card";
import { Button } from "@/components/ui/button";
import {
  getBusinessDashboardPath,
  getBusinessInquiriesPath,
} from "@/features/businesses/routes";
import { workspacesHubPath } from "@/features/workspaces/routes";
import { getCurrentBusinessRequestContext } from "@/lib/db/business-access";

export default async function DashboardNotFound() {
  const requestContext = await getCurrentBusinessRequestContext();
  const businessSlug = requestContext?.businessContext.business.slug;
  const inquiriesHref = businessSlug
    ? getBusinessInquiriesPath(businessSlug)
    : workspacesHubPath;
  const overviewHref = businessSlug
    ? getBusinessDashboardPath(businessSlug)
    : workspacesHubPath;

  return (
    <div className="flex min-h-[28rem] items-center justify-center">
      <StatePageCard
        actions={
          <>
          <Button asChild variant="outline">
            <Link href={inquiriesHref}>Open inquiries</Link>
          </Button>
          <Button asChild>
            <Link href={overviewHref}>Back to overview</Link>
          </Button>
          </>
        }
        eyebrow="Not found"
        media={
          <div className="flex size-12 items-center justify-center rounded-full border border-border/75 bg-accent/65 text-accent-foreground">
            <SearchX className="size-5" />
          </div>
        }
        title="That dashboard record could not be found."
      >
        <div className="state-card-note">
          Return to the overview or reopen it from a list.
        </div>
      </StatePageCard>
    </div>
  );
}
