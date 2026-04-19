"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  PlusCircle,
} from "lucide-react";

import { BillingStatusCard } from "@/features/billing/components/billing-status-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Combobox } from "@/components/ui/combobox";
import { getBusinessDashboardPath } from "@/features/businesses/routes";
import { getWorkspacePath } from "@/features/workspaces/routes";
import { businessTypeMeta } from "@/features/inquiries/business-types";
import type { BusinessType } from "@/features/inquiries/business-types";
import { TruncatedTextWithTooltip } from "@/components/shared/truncated-text-with-tooltip";
import { DashboardDetailFeed, DashboardDetailFeedItem } from "@/components/shared/dashboard-layout";
import { CreateBusinessDialog } from "@/features/businesses/components/create-business-dialog";
import type { WorkspaceOverview, WorkspaceListItem } from "@/features/workspaces/types";
import type { CreateBusinessActionState } from "@/features/businesses/types";
import type { WorkspaceBillingOverview } from "@/features/billing/types";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useProgressRouter } from "@/hooks/use-progress-router";

type WorkspaceOverviewContentProps = {
  businessView: "active" | "archived" | "trash";
  overview: WorkspaceOverview;
  searchParams: Record<string, string | undefined>;
  workspaceList: WorkspaceListItem[];
  billingOverview: WorkspaceBillingOverview;
  createBusinessAction: (
    state: CreateBusinessActionState,
    formData: FormData,
  ) => Promise<CreateBusinessActionState>;
};

export function WorkspaceOverviewContent({
  businessView,
  overview,
  searchParams,
  workspaceList,
  billingOverview,
  createBusinessAction,
}: WorkspaceOverviewContentProps) {
  const router = useProgressRouter();
  const workspacePath = getWorkspacePath(overview.slug);

  return (
    <div className="grid flex-1 gap-6 xl:grid-cols-3">
      <section className="space-y-4 xl:col-span-2">
        <Tabs defaultValue="businesses" className="w-full">
          <div className="mb-4 flex flex-col gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <TabsList>
                  <TabsTrigger value="businesses">
                    Businesses ({overview.businesses.length})
                  </TabsTrigger>
                  <TabsTrigger value="members">
                    Members ({overview.members.length})
                  </TabsTrigger>
                </TabsList>
                <Combobox
                  buttonClassName="w-full sm:w-[11rem]"
                  id="workspace-business-view"
                  onValueChange={(value) => {
                    const params = new URLSearchParams();

                    for (const [key, currentValue] of Object.entries(searchParams)) {
                      if (typeof currentValue === "string" && key !== "view") {
                        params.set(key, currentValue);
                      }
                    }

                    if (value !== "active") {
                      params.set("view", value);
                    }

                    params.delete("page");

                    const href = params.size
                      ? `${workspacePath}?${params.toString()}`
                      : workspacePath;

                    router.push(href);
                  }}
                  options={[
                    { label: "Active", value: "active" },
                    { label: "Archived", value: "archived" },
                    { label: "Trash", value: "trash" },
                  ]}
                  placeholder="Choose a business view"
                  value={businessView}
                />
              </div>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
                <CreateBusinessDialog
                  action={createBusinessAction}
                  workspaces={workspaceList}
                  isLocked={overview.businesses.length > 0 && overview.plan === "free"}
                  billingProps={
                    overview.businesses.length > 0 && overview.plan === "free"
                      ? {
                          workspaceId: billingOverview.workspaceId,
                          workspaceSlug: billingOverview.workspaceSlug,
                          currentPlan: billingOverview.currentPlan,
                          region: billingOverview.region,
                          defaultCurrency: billingOverview.defaultCurrency,
                        }
                      : undefined
                  }
                />
                {overview.scheduledDeletionAt ? (
                  <Badge className="gap-1 self-start sm:self-auto" variant="outline">
                    <CalendarClock className="size-3.5" />
                    Deletion scheduled
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>

          <TabsContent value="businesses" className="space-y-4 outline-none">
            {overview.businesses.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {overview.businesses.map((business) => {
                  const businessPath = getBusinessDashboardPath(business.slug);

                  return (
                    <Card className="border-border/80 bg-card/98" key={business.id}>
                      <CardHeader className="gap-3">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-background/90 text-sm font-semibold tracking-[0.16em] text-foreground">
                              {business.logoStoragePath ? (
                                <Image
                                  alt={`${business.name} logo`}
                                  className="h-full w-full object-cover"
                                  height={48}
                                  src={`/api/business/${business.slug}/logo`}
                                  unoptimized
                                  width={48}
                                />
                              ) : (
                                getInitials(business.name)
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <CardTitle className="max-w-full">
                                <TruncatedTextWithTooltip
                                  className="w-full"
                                  text={business.name}
                                />
                              </CardTitle>
                              <CardDescription className="mt-1 max-w-full">
                                <TruncatedTextWithTooltip
                                  className="w-full"
                                  text={`/${business.slug}`}
                                />
                              </CardDescription>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">
                            {business.defaultCurrency}
                          </Badge>
                          <Badge className="max-w-full sm:max-w-[16rem]" variant="secondary">
                            <TruncatedTextWithTooltip
                              text={businessTypeMeta[business.businessType as BusinessType].label}
                            />
                          </Badge>
                          {business.recordState === "archived" ? (
                            <Badge variant="secondary">Archived</Badge>
                          ) : null}
                          {business.recordState === "trash" ? (
                            <Badge variant="secondary">In trash</Badge>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button asChild className="w-full sm:w-auto">
                            <Link href={businessPath} prefetch={true}>
                              Open dashboard
                              <ArrowRight data-icon="inline-end" className="size-4" />
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle>Start with your first business</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="soft-panel flex items-start gap-3 px-4 py-4 shadow-none">
                    <PlusCircle className="mt-0.5 size-5 text-primary" />
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium text-foreground">
                        No businesses yet.
                      </p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        Create a business using a starter template to get up and
                        running immediately.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="members" className="outline-none">
            <Card>
              <CardHeader>
                <CardTitle>Workspace Members</CardTitle>
                <CardDescription>
                  Users with access to this workspace.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DashboardDetailFeed>
                  {overview.members.map((member) => (
                    <DashboardDetailFeedItem
                      key={member.userId}
                      avatar={
                        <Avatar className="size-9 border border-border/70 shadow-sm">
                          <AvatarFallback className="bg-background text-xs font-semibold text-foreground">
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                      }
                      title={member.name}
                      meta={member.email}
                      action={
                        <Badge variant="outline" className="capitalize">
                          {member.role}
                        </Badge>
                      }
                    />
                  ))}
                </DashboardDetailFeed>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      <aside className="xl:col-span-1">
        <div className="sticky top-6">
          <BillingStatusCard billing={billingOverview} showPlanComparison={false} />
        </div>
      </aside>
    </div>
  );
}

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase())
    .join("");
}
