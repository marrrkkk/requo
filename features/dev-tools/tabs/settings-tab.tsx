"use client";

import {
  Eye,
  EyeOff,
  Gauge,
  LayoutGrid,
  Paintbrush,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { DEFAULT_SETTINGS, type DevSettings, type PanelPosition } from "./types";

export function SettingsTab({
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
