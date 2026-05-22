"use client";

import * as React from "react";

import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * A responsive overlay that renders as a bottom Sheet on mobile and a
 * centered Dialog on desktop. All sub-components (Header, Title, etc.)
 * automatically resolve to the correct primitive.
 */

type ResponsiveOverlayContextValue = {
  isMobile: boolean;
};

const ResponsiveOverlayContext =
  React.createContext<ResponsiveOverlayContextValue>({ isMobile: false });

function useResponsiveOverlay() {
  return React.useContext(ResponsiveOverlayContext);
}

// --- Root ---

type ResponsiveOverlayProps = React.ComponentProps<typeof Dialog> & {
  children: React.ReactNode;
};

function ResponsiveOverlay({ children, ...props }: ResponsiveOverlayProps) {
  const isMobile = useIsMobile();
  const contextValue = React.useMemo(() => ({ isMobile }), [isMobile]);

  return (
    <ResponsiveOverlayContext.Provider value={contextValue}>
      {isMobile ? (
        <Sheet {...props}>{children}</Sheet>
      ) : (
        <Dialog {...props}>{children}</Dialog>
      )}
    </ResponsiveOverlayContext.Provider>
  );
}

// --- Trigger ---

function ResponsiveOverlayTrigger(
  props: React.ComponentProps<typeof DialogTrigger>,
) {
  const { isMobile } = useResponsiveOverlay();

  return isMobile ? (
    <SheetTrigger {...props} />
  ) : (
    <DialogTrigger {...props} />
  );
}

// --- Content ---

function ResponsiveOverlayContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogContent> & {
  side?: "bottom" | "right";
}) {
  const { isMobile } = useResponsiveOverlay();
  const { side = "bottom", ...rest } = props as { side?: "bottom" | "right" } & Record<string, unknown>;

  if (isMobile) {
    return (
      <SheetContent
        side={side}
        className={className}
        {...(rest as React.ComponentProps<typeof SheetContent>)}
      >
        {children}
      </SheetContent>
    );
  }

  return (
    <DialogContent className={className} {...(rest as React.ComponentProps<typeof DialogContent>)}>
      {children}
    </DialogContent>
  );
}

// --- Header ---

function ResponsiveOverlayHeader(
  props: React.ComponentProps<typeof DialogHeader>,
) {
  const { isMobile } = useResponsiveOverlay();

  return isMobile ? <SheetHeader {...props} /> : <DialogHeader {...props} />;
}

// --- Body ---

function ResponsiveOverlayBody(
  props: React.ComponentProps<typeof DialogBody>,
) {
  const { isMobile } = useResponsiveOverlay();

  return isMobile ? <SheetBody {...props} /> : <DialogBody {...props} />;
}

// --- Footer ---

function ResponsiveOverlayFooter(
  props: React.ComponentProps<typeof DialogFooter>,
) {
  const { isMobile } = useResponsiveOverlay();

  return isMobile ? <SheetFooter {...props} /> : <DialogFooter {...props} />;
}

// --- Title ---

function ResponsiveOverlayTitle(
  props: React.ComponentProps<typeof DialogTitle>,
) {
  const { isMobile } = useResponsiveOverlay();

  return isMobile ? <SheetTitle {...props} /> : <DialogTitle {...props} />;
}

// --- Description ---

function ResponsiveOverlayDescription(
  props: React.ComponentProps<typeof DialogDescription>,
) {
  const { isMobile } = useResponsiveOverlay();

  return isMobile ? (
    <SheetDescription {...props} />
  ) : (
    <DialogDescription {...props} />
  );
}

// --- Close ---

function ResponsiveOverlayClose(
  props: React.ComponentProps<typeof DialogClose>,
) {
  const { isMobile } = useResponsiveOverlay();

  return isMobile ? <SheetClose {...props} /> : <DialogClose {...props} />;
}

export {
  ResponsiveOverlay,
  ResponsiveOverlayTrigger,
  ResponsiveOverlayContent,
  ResponsiveOverlayHeader,
  ResponsiveOverlayBody,
  ResponsiveOverlayFooter,
  ResponsiveOverlayTitle,
  ResponsiveOverlayDescription,
  ResponsiveOverlayClose,
};
