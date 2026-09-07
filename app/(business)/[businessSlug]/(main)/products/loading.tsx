import { PageHeader } from "@/components/shared/page-header";
import { ProductsPageSkeleton } from "@/components/shell/products-page-skeleton";

export default function BusinessProductsLoading() {
  return (
    <>
      <PageHeader
        title="Products"
        description="Reusable blocks and packages for faster quotes."
      />
      <ProductsPageSkeleton />
    </>
  );
}