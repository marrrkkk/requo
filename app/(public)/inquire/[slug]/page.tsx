import { notFound } from "next/navigation";

import { submitPublicInquiryAction } from "@/features/inquiries/actions";
import { PublicInquiryPageRenderer } from "@/features/inquiries/components/public-inquiry-page-renderer";
import { getPublicInquiryWorkspaceBySlug } from "@/features/inquiries/queries";

export default async function PublicInquiryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const workspace = await getPublicInquiryWorkspaceBySlug(slug);

  if (!workspace) {
    notFound();
  }

  const submitPublicInquiry = submitPublicInquiryAction.bind(null, workspace.slug);

  return (
    <PublicInquiryPageRenderer
      workspace={workspace}
      action={submitPublicInquiry}
    />
  );
}
