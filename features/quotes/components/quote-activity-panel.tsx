"use client";

import {
  DashboardDetailFeed,
  DashboardDetailFeedItem,
  DashboardEmptyState,
  DashboardSection,
} from "@/components/shared/dashboard-layout";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { DashboardQuoteActivity } from "@/features/quotes/types";
import { formatQuoteDateTime } from "@/features/quotes/utils";
import { History } from "lucide-react";

const QUOTE_ACTIVITY_PREVIEW_LIMIT = 1;

type QuoteActivityPanelProps = {
  activities: DashboardQuoteActivity[];
};

export function QuoteActivityPanel({ activities }: QuoteActivityPanelProps) {
  const preview = activities.slice(0, QUOTE_ACTIVITY_PREVIEW_LIMIT);

  return (
    <DashboardSection
      description="Quote events and owner actions."
      title="Activity log"
    >
      {activities.length ? (
        <div className="flex flex-col gap-4">
          <DashboardDetailFeed>
            {preview.map((activity) => (
              <DashboardDetailFeedItem
                key={activity.id}
                meta={
                  <>
                    <span>{activity.actorName ?? "Requo"}</span>
                    <span aria-hidden="true">|</span>
                    <span>{formatQuoteDateTime(activity.createdAt)}</span>
                  </>
                }
                title={activity.summary}
              />
            ))}
          </DashboardDetailFeed>

          {activities.length > QUOTE_ACTIVITY_PREVIEW_LIMIT ? (
            <Sheet>
              <SheetTrigger asChild>
                <Button className="w-full" type="button" variant="outline">
                  View all activity
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-xl">
                <SheetHeader>
                  <SheetTitle>Quote activity</SheetTitle>
                  <SheetDescription>
                    Full timeline of events and owner actions for this quote.
                  </SheetDescription>
                </SheetHeader>
                <SheetBody className="min-h-0 flex-1">
                  <ScrollArea className="h-full pr-4">
                    <DashboardDetailFeed>
                      {activities.map((activity) => (
                        <DashboardDetailFeedItem
                          key={activity.id}
                          meta={
                            <>
                              <span>{activity.actorName ?? "Requo"}</span>
                              <span aria-hidden="true">|</span>
                              <span>{formatQuoteDateTime(activity.createdAt)}</span>
                            </>
                          }
                          title={activity.summary}
                        />
                      ))}
                    </DashboardDetailFeed>
                  </ScrollArea>
                </SheetBody>
              </SheetContent>
            </Sheet>
          ) : null}
        </div>
      ) : (
        <DashboardEmptyState
          description="Send the quote or change its status to start the timeline for this quote."
          icon={History}
          title="No quote activity yet"
          variant="section"
        />
      )}
    </DashboardSection>
  );
}
