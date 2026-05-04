"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, PanelsTopLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { getBusinessDashboardPath } from "@/features/businesses/routes";
import {
  formatRelativeTime,
  getRecentBusinesses,
  type RecentBusiness,
} from "@/features/businesses/recently-opened";
import { businessTypeMeta } from "@/features/inquiries/business-types";
import type { BusinessType } from "@/features/inquiries/business-types";

type RecentlyOpenedBusinessesProps = {
  userId: string;
};

export function RecentlyOpenedBusinesses({
  userId,
}: RecentlyOpenedBusinessesProps) {
  const [recents, setRecents] = useState<RecentBusiness[]>([]);

  useEffect(() => {
    setRecents(getRecentBusinesses(userId));
  }, [userId]);

  if (recents.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="size-3.5 text-muted-foreground" />
        <p className="meta-label">Recently opened</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {recents.map((business, index) => {
          const businessPath = getBusinessDashboardPath(business.slug);
          const typeMeta = businessTypeMeta[business.businessType as BusinessType];

          return (
            <Link
              className={`group/recent block ${index >= 1 ? "hidden sm:block" : ""}`}
              href={businessPath}
              key={business.slug}
              prefetch={true}
            >
              <Card className="h-full border-border/60 bg-card/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out hover:border-border hover:bg-card hover:shadow-[0_3px_8px_rgba(15,23,42,0.06)] dark:border-white/6 dark:bg-card/60 dark:shadow-[0_1px_2px_rgba(0,0,0,0.2)] dark:hover:border-white/10 dark:hover:bg-card/80 dark:hover:shadow-[0_3px_8px_rgba(0,0,0,0.25)]">
                <CardHeader className="gap-0 pb-3">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-background/90 text-[0.7rem] font-semibold tracking-[0.14em] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] dark:border-white/8 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      {business.logoStoragePath ? (
                        <Image
                          alt={`${business.name} logo`}
                          className="h-full w-full object-cover"
                          height={40}
                          src={`/api/business/${business.slug}/logo`}
                          unoptimized
                          width={40}
                        />
                      ) : (
                        getInitials(business.name)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {business.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        /{business.slug}
                      </p>
                    </div>
                    <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground/50 transition-[color,transform] duration-150 ease-out group-hover/recent:translate-x-0.5 group-hover/recent:text-foreground" />
                  </div>
                </CardHeader>

                <CardContent className="space-y-2.5 pt-0">

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge className="max-w-full" variant="outline">
                      {business.defaultCurrency}
                    </Badge>
                    {typeMeta ? (
                      <Badge className="max-w-full truncate" variant="secondary">
                        {typeMeta.label}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1.5 text-[0.7rem] text-muted-foreground/70">
                    <PanelsTopLeft className="size-3 shrink-0" />
                    <span className="truncate">{business.workspaceName || business.workspaceSlug}</span>
                    <span className="ml-auto shrink-0 tabular-nums">
                      {formatRelativeTime(business.lastOpenedAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
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
