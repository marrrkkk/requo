import { getAccountProfileForUser } from "@/features/account/queries";
import { profileAvatarBucket } from "@/features/account/utils";
import { buildContentDisposition } from "@/lib/files";
import { getOptionalSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const session = await getOptionalSession();

  if (!session) {
    return new Response("Not found", {
      status: 404,
      headers: {
        "cache-control": "no-store",
      },
    });
  }

  const profile = await getAccountProfileForUser(session.user.id);

  if (!profile?.avatarStoragePath) {
    return new Response("Not found", {
      status: 404,
      headers: {
        "cache-control": "no-store",
      },
    });
  }

  const storageClient = createSupabaseAdminClient();
  const { data, error } = await storageClient.storage
    .from(profileAvatarBucket)
    .download(profile.avatarStoragePath);

  if (error || !data) {
    console.error("Failed to download profile avatar from storage.", error);

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
        profile.avatarStoragePath.split("/").pop() ?? "profile-avatar",
        "inline",
      ),
      "content-type": profile.avatarContentType ?? "application/octet-stream",
      "x-content-type-options": "nosniff",
    },
  });
}
