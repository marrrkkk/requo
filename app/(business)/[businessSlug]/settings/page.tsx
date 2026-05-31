import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Settings",
  description: "Personal and business settings for your Requo workspace.",
});

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;

  redirect(`/${businessSlug}/settings/profile`);
}
