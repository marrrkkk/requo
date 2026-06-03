import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { getAdminBusinessDetailPath } from "@/features/admin/navigation";
import type { AdminBusinessRow } from "@/features/admin/types";
import { planMeta, type BusinessPlan } from "@/lib/plans";

type AdminBusinessesListCardsProps = {
  items: AdminBusinessRow[];
};

export function AdminBusinessesListCards({
  items,
}: AdminBusinessesListCardsProps) {
  return (
    <div className="data-list-mobile-grid xl:hidden">
      {items.map((item) => {
        const href = getAdminBusinessDetailPath(item.id);

        return (
          <Link
            className="data-list-card group"
            href={href}
            key={item.id}
            prefetch={true}
          >
            <div className="flex flex-col gap-2">
              <p className="font-medium text-foreground group-hover:text-primary">
                {item.name}
              </p>
              <p className="text-sm text-muted-foreground">{item.slug}</p>
              <p className="text-sm text-muted-foreground">{item.ownerEmail}</p>
              <Badge variant={item.plan === "free" ? "outline" : "secondary"}>
                {planMeta[item.plan as BusinessPlan]?.label ?? item.plan}
              </Badge>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
