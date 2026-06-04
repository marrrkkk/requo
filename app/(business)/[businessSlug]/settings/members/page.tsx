import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getBusinessMembersPath } from "@/features/businesses/routes";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Members",
  description: "Redirects to the business members management page.",
});

export const unstable_instant = {
  prefetch: "static",
  samples: [
    {
      params: { businessSlug: "demo" },
      headers: [
        ["rsc", "1"],
        ["next-action", null],
      ],
    },
  ],
};

export default function BusinessMembersSettingsPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <MembersRedirectContent params={params} />
    </Suspense>
  );
}

async function MembersRedirectContent({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  redirect(getBusinessMembersPath(businessSlug));
  return null as never;
}
