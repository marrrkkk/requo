import * as React from "react";

const MD_BREAKPOINT = 768;

/**
 * Returns true when viewport width is >= 768px (Tailwind `md` breakpoint).
 * Useful for conditionally rendering desktop-only or mobile-only UI.
 */
export function useIsMdScreen() {
  const [isMd, setIsMd] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(
      `(min-width: ${MD_BREAKPOINT}px)`,
    );

    const update = () => {
      setIsMd(mediaQuery.matches);
    };

    mediaQuery.addEventListener("change", update);
    update();

    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return !!isMd;
}
