/**
 * Soft backdrop in front of the pixel canvas — covers dots behind section
 * content while fading out smoothly on all 4 edges for readability.
 * Copied from the landing FAQ section; reuse everywhere instead of
 * duplicating the masked-div markup.
 */
export function MarketingSectionBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -inset-y-28 left-1/2 z-0 w-screen -translate-x-1/2"
      style={{
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, black 100px, black calc(100% - 100px), transparent 100%)",
        maskImage:
          "linear-gradient(to bottom, transparent 0%, black 100px, black calc(100% - 100px), transparent 100%)",
      }}
    >
      <div
        className="size-full bg-background"
        style={{
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
          maskImage:
            "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
        }}
      />
    </div>
  );
}
