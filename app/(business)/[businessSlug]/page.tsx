import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getBusinessDashboardPath } from "@/features/businesses/routes";

type BusinessSlugIndexPageProps = {
  params: Promise<{ businessSlug: string }>;
};

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

/**
 * Businesses hub index page — non-blocking structural shell.
 *
 * Returns an empty shell synchronously and performs the redirect
 * inside a Suspense-wrapped child server component.
 */
export default function BusinessSlugIndexPage({
  params,
}: BusinessSlugIndexPageProps) {
  return (
    <Suspense fallback={null}>
      <BusinessSlugIndexRedirect params={params} />
    </Suspense>
  );
}

async function BusinessSlugIndexRedirect({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;

  redirect(getBusinessDashboardPath(businessSlug));

  // redirect() throws and never reaches here; explicit return satisfies the
  // ReactNode return type requirement for async server components.
  return null;
}
