import { buildContentDisposition } from "@/lib/files";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPublicWorkspaceLogoAssetBySlug } from "@/features/inquiries/queries";
import { workspaceLogoBucket } from "@/features/settings/utils";

export async function GET(
  _request: Request,
  {
    params,
  }: {
  params: Promise<{ slug: string }>;
  },
) {
  const { slug } = await params;
  const asset = await getPublicWorkspaceLogoAssetBySlug(slug);

  if (!asset?.logoStoragePath) {
    return new Response("Not found", {
      status: 404,
      headers: {
        "cache-control": "public, max-age=300, stale-while-revalidate=60",
      },
    });
  }

  const storageClient = createSupabaseAdminClient();
  const { data, error } = await storageClient.storage
    .from(workspaceLogoBucket)
    .download(asset.logoStoragePath);

  if (error || !data) {
    console.error("Failed to download public workspace logo from storage.", error);

    return new Response("Not found", {
      status: 404,
      headers: {
        "cache-control": "public, max-age=300, stale-while-revalidate=60",
      },
    });
  }

  return new Response(data, {
    headers: {
      "cache-control": "public, max-age=300, stale-while-revalidate=60",
      "content-disposition": buildContentDisposition(
        asset.logoStoragePath.split("/").pop() ?? "workspace-logo",
        "inline",
      ),
      "content-type": asset.logoContentType ?? "application/octet-stream",
      "x-content-type-options": "nosniff",
    },
  });
}
