"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  Cpu,
  HardDrive,
  RefreshCw,
  Timer,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type ServerMetrics = {
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  uptime: number;
  nodeVersion: string;
  pid: number;
} | null;

type ClientMetrics = {
  domNodes: number;
  jsHeapUsed: number | null;
  jsHeapTotal: number | null;
  connectionType: string | null;
  navigationTiming: {
    dns: number;
    tcp: number;
    ttfb: number;
    domContentLoaded: number;
    load: number;
  } | null;
  hydrationTime: number | null;
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function PerformanceTab() {
  const [serverMetrics, setServerMetrics] = useState<ServerMetrics>(null);
  const [clientMetrics, setClientMetrics] = useState<ClientMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [renderCount, setRenderCount] = useState(0);
  const renderCountRef = useRef(0);

  // Track render count
  renderCountRef.current += 1;
  useEffect(() => {
    setRenderCount(renderCountRef.current);
  });

  const fetchServerMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dev/timing");
      if (res.ok) {
        setServerMetrics(await res.json());
      }
    } catch {
      toast.error("Failed to fetch server metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  const measureClient = useCallback(() => {
    const domNodes = document.querySelectorAll("*").length;

    // Memory (Chrome-only)
    let jsHeapUsed: number | null = null;
    let jsHeapTotal: number | null = null;
    const perf = performance as Performance & {
      memory?: { usedJSHeapSize: number; totalJSHeapSize: number };
    };
    if (perf.memory) {
      jsHeapUsed = Math.round(perf.memory.usedJSHeapSize / 1024 / 1024);
      jsHeapTotal = Math.round(perf.memory.totalJSHeapSize / 1024 / 1024);
    }

    // Connection
    const nav = navigator as Navigator & {
      connection?: { effectiveType: string };
    };
    const connectionType = nav.connection?.effectiveType ?? null;

    // Navigation timing
    let navigationTiming: ClientMetrics["navigationTiming"] = null;
    const [navEntry] = performance.getEntriesByType(
      "navigation",
    ) as PerformanceNavigationTiming[];
    if (navEntry) {
      navigationTiming = {
        dns: Math.round(navEntry.domainLookupEnd - navEntry.domainLookupStart),
        tcp: Math.round(navEntry.connectEnd - navEntry.connectStart),
        ttfb: Math.round(navEntry.responseStart - navEntry.requestStart),
        domContentLoaded: Math.round(
          navEntry.domContentLoadedEventEnd - navEntry.startTime,
        ),
        load: Math.round(navEntry.loadEventEnd - navEntry.startTime),
      };
    }

    // Hydration time (look for Next.js hydration mark)
    let hydrationTime: number | null = null;
    const marks = performance.getEntriesByType("mark");
    const hydrationMark = marks.find(
      (m) => m.name.includes("hydrat") || m.name.includes("Hydrat"),
    );
    if (hydrationMark) {
      hydrationTime = Math.round(hydrationMark.startTime);
    }

    setClientMetrics({
      domNodes,
      jsHeapUsed,
      jsHeapTotal,
      connectionType,
      navigationTiming,
      hydrationTime,
    });
  }, []);

  useEffect(() => {
    fetchServerMetrics();
    measureClient();
  }, [fetchServerMetrics, measureClient]);

  const formatUptime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <div className="space-y-3">
      {/* Client Metrics */}
      <section className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            <Zap className="size-3" />
            Client
          </div>
          <Button variant="ghost" size="icon-xs" onClick={measureClient}>
            <RefreshCw className="size-2.5" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <MetricCard
            label="DOM Nodes"
            value={clientMetrics?.domNodes?.toLocaleString() ?? "—"}
            warn={clientMetrics ? clientMetrics.domNodes > 3000 : false}
          />
          <MetricCard
            label="Renders"
            value={String(renderCount)}
          />
          {clientMetrics?.jsHeapUsed != null && (
            <MetricCard
              label="JS Heap"
              value={`${clientMetrics.jsHeapUsed}/${clientMetrics.jsHeapTotal}MB`}
              warn={
                clientMetrics.jsHeapTotal
                  ? clientMetrics.jsHeapUsed / clientMetrics.jsHeapTotal > 0.8
                  : false
              }
            />
          )}
          {clientMetrics?.connectionType && (
            <MetricCard
              label="Connection"
              value={clientMetrics.connectionType}
            />
          )}
        </div>
      </section>

      {/* Navigation Timing */}
      {clientMetrics?.navigationTiming && (
        <section className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            <Timer className="size-3" />
            Navigation Timing
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <MetricCard
              label="TTFB"
              value={`${clientMetrics.navigationTiming.ttfb}ms`}
              warn={clientMetrics.navigationTiming.ttfb > 600}
            />
            <MetricCard
              label="DOM Ready"
              value={`${clientMetrics.navigationTiming.domContentLoaded}ms`}
              warn={clientMetrics.navigationTiming.domContentLoaded > 3000}
            />
            <MetricCard
              label="Full Load"
              value={`${clientMetrics.navigationTiming.load}ms`}
              warn={clientMetrics.navigationTiming.load > 5000}
            />
            {clientMetrics.hydrationTime != null && (
              <MetricCard
                label="Hydration"
                value={`${clientMetrics.hydrationTime}ms`}
                warn={clientMetrics.hydrationTime > 1000}
              />
            )}
          </div>
        </section>
      )}

      {/* Server Metrics */}
      <section className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            <Cpu className="size-3" />
            Server
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={fetchServerMetrics}
            disabled={loading}
          >
            <RefreshCw className={`size-2.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        {serverMetrics ? (
          <div className="grid grid-cols-2 gap-1.5">
            <MetricCard
              label="Heap Used"
              value={`${serverMetrics.memory.heapUsed}MB`}
              warn={serverMetrics.memory.heapUsed > 500}
            />
            <MetricCard
              label="RSS"
              value={`${serverMetrics.memory.rss}MB`}
              warn={serverMetrics.memory.rss > 1024}
            />
            <MetricCard label="Uptime" value={formatUptime(serverMetrics.uptime)} />
            <MetricCard label="Node" value={serverMetrics.nodeVersion} />
          </div>
        ) : (
          <div className="rounded-md bg-muted/40 px-2.5 py-2 text-xs text-muted-foreground">
            {loading ? "Loading..." : "Failed to load server metrics"}
          </div>
        )}
      </section>

      {/* Actions */}
      <section className="border-t border-border/40 pt-2">
        <Button
          variant="ghost"
          size="xs"
          onClick={() => {
            measureClient();
            fetchServerMetrics();
            toast.success("Metrics refreshed");
          }}
          className="w-full gap-1.5"
        >
          <Activity className="size-3" />
          Refresh All Metrics
        </Button>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  MetricCard                                                                */
/* -------------------------------------------------------------------------- */

function MetricCard({
  label,
  value,
  warn = false,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-md px-2.5 py-1.5 ${
        warn ? "bg-orange-500/10" : "bg-muted/40"
      }`}
    >
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div
        className={`font-mono text-xs font-medium ${
          warn ? "text-orange-600 dark:text-orange-400" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
