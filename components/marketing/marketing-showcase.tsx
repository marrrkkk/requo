import Image from "next/image";

export function MarketingShowcase() {
  return (
    <div className="hero-panel mx-auto w-full max-w-6xl overflow-hidden p-3 sm:p-4 lg:p-5">
      <div className="overflow-hidden rounded-lg border border-border/75 bg-background/92 shadow-[var(--surface-shadow-md)]">
        <Image
          alt="Requo dashboard quotes view"
          className="h-auto w-full"
          height={1180}
          priority
          sizes="(max-width: 1280px) 100vw, 1100px"
          src="/marketing/dashboard-overview.png"
          width={1440}
        />
      </div>
    </div>
  );
}
