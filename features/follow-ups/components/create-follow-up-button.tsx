import Link from "next/link";
import { CalendarPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getBusinessInquiriesPath } from "@/features/businesses/routes";

type CreateFollowUpButtonProps = {
  businessSlug: string;
};

export function CreateFollowUpButton({ businessSlug }: CreateFollowUpButtonProps) {
  return (
    <Button asChild>
      <Link href={getBusinessInquiriesPath(businessSlug)}>
        <CalendarPlus data-icon="inline-start" />
        Create follow-up
      </Link>
    </Button>
  );
}
