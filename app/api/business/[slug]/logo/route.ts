import { getBusinessLogoAssetForBusiness } from "@/features/settings/queries";
import { buildContentDisposition } from "@/lib/files";
import { getBusinessRequestContextForSlug } from "@/lib/db/business-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { businessLogoBucket } from "@/features/settings/utils";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const requestContext = await getBusinessRequestContextForSlug(slug);

  if (!requestContext) {
    return new Response("Not found", {
      status: 404,
      headers: {
        "cache-control": "no-store",
      },
    });
  }

  const asset = await getBusinessLogoAssetForBusiness(
    requestContext.businessContext.business.id,
  );

  if (!asset?.logoStoragePath) {
    return new Response("Not found", {
      status: 404,
      headers: {
        "cache-control": "no-store",
      },
    });
  }

  const storageClient = createSupabaseAdminClient();
  const { data, error } = await storageClient.storage
    .from(businessLogoBucket)
    .download(asset.logoStoragePath);

  if (error || !data) {
    console.error("Failed to download business logo from storage.", error);

    return new Response("Not found", {
      status: 404,
      headers: {
        "cache-control": "no-store",
      },
    });
  }

  return new Response(data, {
    headers: {
      "cache-control": "private, max-age=300, stale-while-revalidate=60",
      "content-disposition": buildContentDisposition(
        asset.logoStoragePath.split("/").pop() ?? "business-logo",
        "inline",
      ),
      "content-type": asset.logoContentType ?? "application/octet-stream",
      "x-content-type-options": "nosniff",
    },
  });
}
