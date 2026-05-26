"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Gauge,
  Globe,
  GraduationCap,
  LayoutGrid,
  Moon,
  Paintbrush,
  RefreshCw,
  RotateCcw,
  Sun,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getBusinessDashboardPath, getBusinessDashboardSlugFromPathname } from "@/features/businesses/routes";
import { resetDashboardTourForDevAction } from "@/features/onboarding/tour-actions";
import {
  clearDashboardTourLocalStorage,
  DASHBOARD_TOUR_DEV_SHOW_EVENT,
} from "@/features/onboarding/tour-keys";

import type { DevSettings, UserContext } from "./types";

export function ToolsTab({
  context,
  onRevalidate,
  onToggleTheme,
  settings,
  onUpdateSettings,
}: {
  context: UserContext | null;
  onRevalidate: () => void;
  onToggleTheme: () => void;
  settings: DevSettings;
  onUpdateSettings: (patch: Partial<DevSettings>) => void;
}) {
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [resettingTour, setResettingTour] = useState(false);

  const activeBusiness = (() => {
    if (typeof window === "undefined") {
      return null;
    }

    const slug = getBusinessDashboardSlugFromPathname(window.location.pathname);
    if (!slug || !context) {
      return null;
    }

    const business = context.businesses.find((entry) => entry.slug === slug);
    return business ? { ...business, slug } : null;
  })();

  const showDashboardTour = () => {
    if (!activeBusiness) {
      toast.error("Open a business you own (e.g. /your-slug/home) first.");
      return;
    }

    clearDashboardTourLocalStorage(activeBusiness.id);

    const homePath = getBusinessDashboardPath(activeBusiness.slug);
    const onHome =
      window.location.pathname === homePath ||
      window.location.pathname === `/${activeBusiness.slug}`;

    if (!onHome) {
      try {
        sessionStorage.setItem(
          "requo:dev:pending-dashboard-tour",
          activeBusiness.id,
        );
      } catch {
        // sessionStorage unavailable
      }
      window.location.href = homePath;
      return;
    }

    window.dispatchEvent(new CustomEvent(DASHBOARD_TOUR_DEV_SHOW_EVENT));
    toast.success("Opening dashboard tour");
  };

  const resetDashboardTour = async () => {
    if (!activeBusiness) {
      toast.error("Open a business you own to reset its tour.");
      return;
    }

    setResettingTour(true);
    try {
      clearDashboardTourLocalStorage(activeBusiness.id);
      await resetDashboardTourForDevAction({
        businessId: activeBusiness.id,
        businessSlug: activeBusiness.slug,
      });
      toast.success("Dashboard tour reset for this business");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to reset tour",
      );
    } finally {
      setResettingTour(false);
    }
  };

  const measureLatency = async () => {
    const start = performance.now();
    try {
      await fetch("/api/dev/context");
      setResponseTime(Math.round(performance.now() - start));
    } catch {
      toast.error("Ping failed");
    }
  };

  const hardReload = () => {
    window.location.reload();
  };

  const clearLocalStorage = () => {
    const keys = Object.keys(localStorage).filter(
      (k) => !k.startsWith("dev-tools"),
    );
    keys.forEach((k) => localStorage.removeItem(k));
    toast.success(`Cleared ${keys.length} localStorage entries`);
  };

  const clearSessionStorage = () => {
    const count = sessionStorage.length;
    sessionStorage.clear();
    toast.success(`Cleared ${count} sessionStorage entries`);
  };

  const copyCurrentRoute = () => {
    navigator.clipboard.writeText(window.location.pathname);
    toast.success("Copied route path");
  };

  return (
    <div className="space-y-3">
      {/* Quick Actions */}
      <section className="space-y-1.5">
        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          Cache & Reload
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            variant="outline"
            size="xs"
            onClick={onRevalidate}
            className="gap-1.5"
          >
            <RefreshCw className="size-3" />
            Bust Cache
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={hardReload}
            className="gap-1.5"
          >
            <RotateCcw className="size-3" />
            Hard Reload
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={clearLocalStorage}
            className="gap-1.5"
          >
            <X className="size-3" />
            Clear Local
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={clearSessionStorage}
            className="gap-1.5"
          >
            <X className="size-3" />
            Clear Session
          </Button>
        </div>
      </section>

      {/* Onboarding tour (dev) */}
      <section className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          <GraduationCap className="size-3" />
          Onboarding tour
        </div>
        <p className="text-[10px] leading-5 text-muted-foreground">
          {activeBusiness
            ? `Active: ${activeBusiness.name} (/${activeBusiness.slug})`
            : "Navigate to a business home page you own."}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            className="gap-1.5"
            onClick={showDashboardTour}
            size="xs"
            type="button"
            variant="outline"
          >
            <GraduationCap className="size-3" />
            Show tour
          </Button>
          <Button
            className="gap-1.5"
            disabled={resettingTour || !activeBusiness}
            onClick={resetDashboardTour}
            size="xs"
            type="button"
            variant="outline"
          >
            <RotateCcw className="size-3" />
            Reset tour
          </Button>
        </div>
      </section>

      {/* Theme & Display */}
      <section className="space-y-1.5">
        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          Theme & Display
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            variant="outline"
            size="xs"
            onClick={onToggleTheme}
            className="gap-1.5"
          >
            <Sun className="size-3" />
            <Moon className="size-3" />
            Toggle
          </Button>
          <Button
            variant={settings.showGridOverlay ? "default" : "outline"}
            size="xs"
            onClick={() =>
              onUpdateSettings({ showGridOverlay: !settings.showGridOverlay })
            }
            className="gap-1.5"
          >
            <LayoutGrid className="size-3" />
            Grid
          </Button>
          <Button
            variant={settings.showRenderOutlines ? "default" : "outline"}
            size="xs"
            onClick={() =>
              onUpdateSettings({
                showRenderOutlines: !settings.showRenderOutlines,
              })
            }
            className="gap-1.5"
          >
            <Paintbrush className="size-3" />
            Outlines
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={copyCurrentRoute}
            className="gap-1.5"
          >
            <Globe className="size-3" />
            Copy Route
          </Button>
        </div>
      </section>

      {/* Network */}
      <section className="space-y-1.5">
        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          Network
        </div>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="xs"
            onClick={measureLatency}
            className="flex-1 gap-1.5"
          >
            <Clock className="size-3" />
            Ping API
          </Button>
          <Button
            variant={settings.slowNetwork ? "default" : "outline"}
            size="xs"
            onClick={() =>
              onUpdateSettings({ slowNetwork: !settings.slowNetwork })
            }
            className="flex-1 gap-1.5"
          >
            <Gauge className="size-3" />
            Slow Mode
          </Button>
        </div>
        {responseTime !== null && (
          <div className="rounded-md bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
            Last ping: <span className="font-mono font-medium text-foreground">{responseTime}ms</span>
          </div>
        )}
      </section>

      {/* Viewport Info */}
      <section className="space-y-1.5">
        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          Viewport
        </div>
        <ViewportInfo />
      </section>
    </div>
  );
}

function ViewportInfo() {
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const update = () =>
      setSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const breakpoint =
    size.w >= 1536
      ? "2xl"
      : size.w >= 1280
        ? "xl"
        : size.w >= 1024
          ? "lg"
          : size.w >= 768
            ? "md"
            : size.w >= 640
              ? "sm"
              : "xs";

  return (
    <div className="flex items-center gap-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-xs">
      <span className="font-mono">
        {size.w}×{size.h}
      </span>
      <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
        {breakpoint}
      </Badge>
    </div>
  );
}
