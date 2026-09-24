import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() { return <DashboardPage><PageHeader eyebrow="New invoice" title="Create a new invoice" /><div className="dashboard-detail-layout items-start xl:grid-cols-[minmax(0,1.08fr)_0.92fr]"><div className="dashboard-side-stack min-w-0"><Skeleton className="h-64 w-full" /><Skeleton className="h-44 w-full" /></div><Skeleton className="hidden h-[34rem] w-full xl:block" /></div></DashboardPage>; }
