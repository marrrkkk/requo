"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bug,
  ChevronDown,
  ChevronUp,
  Gauge,
  Settings,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { ContextTab } from "./tabs/context-tab";
import { SettingsTab } from "./tabs/settings-tab";
import { ToolsTab } from "./tabs/tools-tab";
import {
  loadSettings,
  OPEN_KEY,
  POSITION_CLASSES,
  saveSettings,
  type DevSettings,
  type PanelTab,
  type UserContext,
} from "./tabs/types";

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
                context={context}
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
