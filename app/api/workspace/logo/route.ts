import { getWorkspaceLogoAssetForWorkspace } from "@/features/settings/queries";
import { requireCurrentWorkspaceContext } from "@/lib/db/workspace-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { workspaceLogoBucket } from "@/features/settings/utils";

export async function GET() {
  const { workspaceContext } = await requireCurrentWorkspaceContext();
  const asset = await getWorkspaceLogoAssetForWorkspace(workspaceContext.workspace.id);

  if (!asset?.logoStoragePath) {
    return new Response("Not found", {
      status: 404,
    });
  }

  const storageClient = createSupabaseAdminClient();
  const { data, error } = await storageClient.storage
    .from(workspaceLogoBucket)
    .download(asset.logoStoragePath);

  if (error || !data) {
    return new Response("Not found", {
      status: 404,
    });
  }

  const arrayBuffer = await data.arrayBuffer();

  return new Response(arrayBuffer, {
    headers: {
      "content-type": asset.logoContentType ?? "application/octet-stream",
      "cache-control": "private, max-age=300",
    },
  });
}
