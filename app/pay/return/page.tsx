import type { Metadata } from "next";

import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Payment return",
  description: "Confirming your invoice payment with the payment provider.",
});

export default function PayReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  return <PayReturnContent searchParams={searchParams} />;
}

async function PayReturnContent({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const cancelled = status === "cancelled";
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold tracking-tight">
        {cancelled ? "Payment cancelled" : "Payment submitted"}
      </h1>
      <p className="text-sm leading-6 text-muted-foreground">
        {cancelled
          ? "No payment was completed. You can return to your invoice and try again, or contact the business for another way to pay."
          : "We're confirming your payment with the payment provider. Your invoice updates automatically once the provider confirms it — there's nothing else you need to do here."}
      </p>
    </main>
  );
}
