import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() { return <DashboardPage><PageHeader title="Invoices" actions={<Skeleton className="h-9 w-32" />} /><Skeleton className="h-64 w-full" /></DashboardPage>; }
