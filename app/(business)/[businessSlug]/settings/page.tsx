import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Settings",
  description: "Personal and business settings for your Requo workspace.",
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

export default function SettingsPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <SettingsRedirect params={params} />
    </Suspense>
  );
}

async function SettingsRedirect({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  redirect(`/${businessSlug}/settings/profile`);
}
