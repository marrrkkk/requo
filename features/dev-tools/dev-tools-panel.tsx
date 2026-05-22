"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bug,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Gauge,
  Globe,
  LayoutGrid,
  Moon,
  Paintbrush,
  RefreshCw,
  RotateCcw,
  Settings,
  Sun,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type UserContext = {
  authenticated: boolean;
  user: { id: string; email: string; name: string } | null;
  subscription: {
    plan: string;
    status: string;
    canceledAt: string | null;
  } | null;
  businesses: Array<{
    id: string;
    name: string;
    slug: string;
    plan: string;
  }>;
};

type PanelPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left";
type PanelTab = "context" | "tools" | "settings";

type DevSettings = {
  position: PanelPosition;
  showGridOverlay: boolean;
  slowNetwork: boolean;
  showRenderOutlines: boolean;
};

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const PLANS = ["free", "pro", "business"] as const;

const POSITION_CLASSES: Record<PanelPosition, string> = {
  "bottom-right": "right-4 bottom-4",
  "bottom-left": "left-4 bottom-4",
  "top-right": "right-4 top-4",
  "top-left": "left-4 top-4",
};

const STORAGE_KEY = "dev-tools-settings";
const OPEN_KEY = "dev-tools-open";

const DEFAULT_SETTINGS: DevSettings = {
  position: "bottom-right",
  showGridOverlay: false,
  slowNetwork: false,
  showRenderOutlines: false,
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function loadSettings(): DevSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: DevSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function DevToolsPanel() {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(OPEN_KEY) === "true";
  });
  const [minimized, setMinimized] = useState(false);
  const [tab, setTab] = useState<PanelTab>("context");
  const [context, setContext] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [settings, setSettings] = useState<DevSettings>(loadSettings);

  const updateSettings = (patch: Partial<DevSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  };

  const fetchContext = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dev/context");
      if (res.ok) {
        setContext(await res.json());
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchContext();
    }
  }, [open, fetchContext]);

  useEffect(() => {
    localStorage.setItem(OPEN_KEY, String(open));
  }, [open]);

  // Apply grid overlay
  useEffect(() => {
    const id = "dev-tools-grid-overlay";
    if (settings.showGridOverlay) {
      if (!document.getElementById(id)) {
        const el = document.createElement("div");
        el.id = id;
        el.style.cssText =
          "position:fixed;inset:0;z-index:9998;pointer-events:none;background-image:linear-gradient(to right,rgba(59,130,246,0.05) 1px,transparent 1px),linear-gradient(to bottom,rgba(59,130,246,0.05) 1px,transparent 1px);background-size:8px 8px;";
        document.body.appendChild(el);
      }
    } else {
      document.getElementById(id)?.remove();
    }
    return () => {
      document.getElementById(id)?.remove();
    };
  }, [settings.showGridOverlay]);

  // Apply render outlines
  useEffect(() => {
    const id = "dev-tools-render-outlines";
    if (settings.showRenderOutlines) {
      if (!document.getElementById(id)) {
        const style = document.createElement("style");
        style.id = id;
        style.textContent = "* { outline: 1px solid rgba(255,0,0,0.1) !important; }";
        document.head.appendChild(style);
      }
    } else {
      document.getElementById(id)?.remove();
    }
    return () => {
      document.getElementById(id)?.remove();
    };
  }, [settings.showRenderOutlines]);

  const switchPlan = async (plan: string) => {
    setSwitching(true);
    try {
      const res = await fetch("/api/dev/switch-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (res.ok) {
        toast.success(`Switched to ${plan} plan`);
        await fetchContext();
        setTimeout(() => window.location.reload(), 300);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to switch plan");
      }
    } catch {
      toast.error("Failed to switch plan");
    } finally {
      setSwitching(false);
    }
  };

  const revalidateAll = async () => {
    try {
      const res = await fetch("/api/dev/revalidate", { method: "POST" });
      if (res.ok) {
        toast.success("Cache revalidated");
        setTimeout(() => window.location.reload(), 200);
      }
    } catch {
      toast.error("Failed to revalidate");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label}`);
  };

  const toggleTheme = () => {
    const html = document.documentElement;
    const current = html.classList.contains("dark") ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    html.classList.remove(current);
    html.classList.add(next);
    toast.success(`Theme: ${next}`);
  };

  const positionClass = POSITION_CLASSES[settings.position];

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`fixed ${positionClass} z-[9999] flex size-10 items-center justify-center rounded-full border border-border/60 bg-background/95 text-muted-foreground shadow-lg backdrop-blur-sm transition-all hover:border-primary/50 hover:text-primary hover:shadow-xl`}
        title="Open Dev Tools"
      >
        <Bug className="size-4" />
      </button>
    );
  }

  return (
    <div
      className={`fixed ${positionClass} z-[9999] w-80 overflow-hidden rounded-xl border border-border/60 bg-background/95 shadow-2xl backdrop-blur-sm`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <Bug className="size-3.5 text-primary" />
          <span className="text-xs font-medium text-foreground">
            Dev Tools
          </span>
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
            dev
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setMinimized(!minimized)}
            title={minimized ? "Expand" : "Minimize"}
          >
            {minimized ? (
              <ChevronUp className="size-3" />
            ) : (
              <ChevronDown className="size-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setOpen(false)}
            title="Close"
          >
            <X className="size-3" />
          </Button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Tab bar */}
          <div className="flex border-b border-border/40">
            {(
              [
                { id: "context", icon: User, label: "Context" },
                { id: "tools", icon: Gauge, label: "Tools" },
                { id: "settings", icon: Settings, label: "Settings" },
              ] as const
            ).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium transition-colors ${
                  tab === id
                    ? "border-b-2 border-primary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-3" />
                {label}
              </button>
            ))}
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-3">
            {tab === "context" && (
              <ContextTab
                context={context}
                loading={loading}
                switching={switching}
                onSwitchPlan={switchPlan}
                onRefresh={fetchContext}
                onCopy={copyToClipboard}
              />
            )}
            {tab === "tools" && (
              <ToolsTab
                onRevalidate={revalidateAll}
                onToggleTheme={toggleTheme}
                settings={settings}
                onUpdateSettings={updateSettings}
              />
            )}
            {tab === "settings" && (
              <SettingsTab
                settings={settings}
                onUpdateSettings={updateSettings}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Context Tab                                                               */
/* -------------------------------------------------------------------------- */

function ContextTab({
  context,
  loading,
  switching,
  onSwitchPlan,
  onRefresh,
  onCopy,
}: {
  context: UserContext | null;
  loading: boolean;
  switching: boolean;
  onSwitchPlan: (plan: string) => void;
  onRefresh: () => void;
  onCopy: (text: string, label: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <RefreshCw className="size-3 animate-spin" />
        Loading...
      </div>
    );
  }

  if (!context?.authenticated) {
    return (
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">
          Not authenticated. Sign in to use dev tools.
        </div>
        <Button variant="outline" size="xs" onClick={onRefresh}>
          <RefreshCw className="size-3" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* User section */}
      <section className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            <User className="size-3" />
            User
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onCopy(context.user?.id ?? "", "user ID")}
            title="Copy user ID"
          >
            <Copy className="size-2.5" />
          </Button>
        </div>
        <div className="rounded-md bg-muted/40 px-2.5 py-1.5 text-xs">
          <div className="font-medium">{context.user?.name}</div>
          <div className="text-muted-foreground">{context.user?.email}</div>
          <div className="mt-0.5 font-mono text-[10px] text-muted-foreground/70">
            {context.user?.id}
          </div>
        </div>
      </section>

      {/* Subscription section */}
      <section className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          <CreditCard className="size-3" />
          Subscription
        </div>
        <div className="flex items-center gap-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-xs">
          <span className="font-medium capitalize">
            {context.subscription?.plan ?? "free"}
          </span>
          <Badge
            variant={
              context.subscription?.status === "active"
                ? "default"
                : "secondary"
            }
            className="h-4 px-1.5 text-[10px]"
          >
            {context.subscription?.status ?? "no subscription"}
          </Badge>
          {context.subscription?.canceledAt && (
            <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
              canceling
            </Badge>
          )}
        </div>

        {/* Plan switcher */}
        <div className="flex gap-1.5">
          {PLANS.map((plan) => {
            const isActive = plan === (context.subscription?.plan ?? "free");
            return (
              <Button
                key={plan}
                variant={isActive ? "default" : "outline"}
                size="xs"
                disabled={isActive || switching}
                onClick={() => onSwitchPlan(plan)}
                className="flex-1 capitalize"
              >
                {plan}
              </Button>
            );
          })}
        </div>
      </section>

      {/* Businesses */}
      {context.businesses.length > 0 && (
        <section className="space-y-1.5">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            Businesses ({context.businesses.length})
          </div>
          <div className="space-y-1">
            {context.businesses.map((biz) => (
              <div
                key={biz.id}
                className="flex items-center justify-between rounded-md bg-muted/40 px-2.5 py-1.5 text-xs"
              >
                <div>
                  <span className="font-medium">{biz.name}</span>
                  <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                    /{biz.slug}
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className="h-4 px-1.5 text-[10px] capitalize"
                >
                  {biz.plan}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Refresh */}
      <div className="border-t border-border/40 pt-2">
        <Button
          variant="ghost"
          size="xs"
          onClick={onRefresh}
          className="w-full gap-1.5"
        >
          <RefreshCw className="size-3" />
          Refresh Context
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tools Tab                                                                 */
/* -------------------------------------------------------------------------- */

function ToolsTab({
  onRevalidate,
  onToggleTheme,
  settings,
  onUpdateSettings,
}: {
  onRevalidate: () => void;
  onToggleTheme: () => void;
  settings: DevSettings;
  onUpdateSettings: (patch: Partial<DevSettings>) => void;
}) {
  const [responseTime, setResponseTime] = useState<number | null>(null);

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

/* -------------------------------------------------------------------------- */
/*  Settings Tab                                                              */
/* -------------------------------------------------------------------------- */

function SettingsTab({
  settings,
  onUpdateSettings,
}: {
  settings: DevSettings;
  onUpdateSettings: (patch: Partial<DevSettings>) => void;
}) {
  const positions: { value: PanelPosition; label: string }[] = [
    { value: "bottom-right", label: "Bottom Right" },
    { value: "bottom-left", label: "Bottom Left" },
    { value: "top-right", label: "Top Right" },
    { value: "top-left", label: "Top Left" },
  ];

  return (
    <div className="space-y-3">
      {/* Position */}
      <section className="space-y-1.5">
        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          Panel Position
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {positions.map(({ value, label }) => (
            <Button
              key={value}
              variant={settings.position === value ? "default" : "outline"}
              size="xs"
              onClick={() => onUpdateSettings({ position: value })}
              className="text-[11px]"
            >
              {label}
            </Button>
          ))}
        </div>
      </section>

      {/* Toggles */}
      <section className="space-y-1.5">
        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          Overlays
        </div>
        <div className="space-y-1">
          <SettingToggle
            label="Grid overlay"
            description="Show 8px grid over the page"
            icon={LayoutGrid}
            enabled={settings.showGridOverlay}
            onToggle={() =>
              onUpdateSettings({ showGridOverlay: !settings.showGridOverlay })
            }
          />
          <SettingToggle
            label="Render outlines"
            description="Red outlines on all elements"
            icon={Paintbrush}
            enabled={settings.showRenderOutlines}
            onToggle={() =>
              onUpdateSettings({
                showRenderOutlines: !settings.showRenderOutlines,
              })
            }
          />
          <SettingToggle
            label="Slow network"
            description="Simulate latency in dev fetches"
            icon={Gauge}
            enabled={settings.slowNetwork}
            onToggle={() =>
              onUpdateSettings({ slowNetwork: !settings.slowNetwork })
            }
          />
        </div>
      </section>

      {/* Reset */}
      <section className="border-t border-border/40 pt-2">
        <Button
          variant="ghost"
          size="xs"
          onClick={() => {
            onUpdateSettings(DEFAULT_SETTINGS);
            toast.success("Settings reset");
          }}
          className="w-full gap-1.5 text-muted-foreground"
        >
          <RotateCcw className="size-3" />
          Reset to Defaults
        </Button>
      </section>
    </div>
  );
}

function SettingToggle({
  label,
  description,
  icon: Icon,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted/40"
    >
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium">{label}</div>
        <div className="text-[10px] text-muted-foreground">{description}</div>
      </div>
      {enabled ? (
        <Eye className="size-3.5 text-primary" />
      ) : (
        <EyeOff className="size-3.5 text-muted-foreground/50" />
      )}
    </button>
  );
}
