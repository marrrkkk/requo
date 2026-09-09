import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() { return <DashboardPage><PageHeader eyebrow="Billing" title="New invoice" description="Create a manual invoice." /><Skeleton className="h-[34rem] w-full" /></DashboardPage>; }
