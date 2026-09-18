export default function PayReturnLoading() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold tracking-tight">Payment submitted</h1>
      <p className="text-sm leading-6 text-muted-foreground">
        We&apos;re confirming your payment with the payment provider.
      </p>
    </main>
  );
}
