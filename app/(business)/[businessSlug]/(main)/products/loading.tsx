import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { ProductsPageSkeleton } from "@/components/shell/products-page-skeleton";

export default function BusinessProductsLoading() {
  return (
    <DashboardPage>
      <PageHeader title="Products" />
      <ProductsPageSkeleton />
    </DashboardPage>
  );
}
