import Link from "next/link";
import { ArrowRight, Clock, PanelsTopLeft } from "lucide-react";

import { BusinessAvatar } from "@/components/shared/business-avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { getBusinessDashboardPath } from "@/features/businesses/routes";
import {
  formatRelativeTime,
  type RecentBusiness,
} from "@/features/businesses/recently-opened";
import { businessTypeMeta } from "@/features/inquiries/business-types";

type RecentlyOpenedBusinessesProps = {
  businesses: RecentBusiness[];
};

export function RecentlyOpenedBusinesses({
  businesses,
}: RecentlyOpenedBusinessesProps) {
  if (businesses.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Clock className="size-3.5 text-muted-foreground" />
        <p className="meta-label">Recently opened</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {businesses.map((business, index) => {
          const businessPath = getBusinessDashboardPath(business.slug);
          const typeMeta = businessTypeMeta[business.businessType];

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
                    <BusinessAvatar
                      name={business.name}
                      logoUrl={business.logoStoragePath ? `/api/business/${business.slug}/logo` : null}
                      size="lg"
                      loading="eager"
                    />
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

                <CardContent className="flex flex-col gap-2.5 pt-0">
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
                    <span className="truncate">{business.businessName || business.slug}</span>
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
