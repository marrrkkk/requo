"use client";

import { type ComponentType } from "react";
import {
  RiArrowDownCircleFill,
  RiArrowUpCircleFill,
  RiBox3Line,
  RiChatSmile2Line,
  RiCoinsFill,
  RiGroupFill,
  RiGroupLine,
  RiIndeterminateCircleFill,
  RiInformationFill,
  RiRefund2Fill,
  RiShoppingBasket2Fill,
  RiShoppingBasketLine,
} from "@remixicon/react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * BoardUI dashboard 1 → stat cards (footer variant), restyled onto Requo
 * tokens per this repo's BoardUI migration convention (see dashboard-sidebar,
 * settings-*): Requo surfaces and type utilities instead of the BoardUI theme
 * layer, which this app does not load.
 *
 * KPI stat cards in two looks:
 *
 *   plain   icon tile, label, value, delta chip — the compact dashboard row
 *   footer  tinted gradient icon tile beside the label (plus an optional
 *           info tooltip), a display-size value, and a muted footer band
 *           carrying the comparison caption and a delta pill
 */

type IconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

export type StatCardsVariant = "plain" | "footer";

/** Tint of the footer variant's gradient icon tile. */
export type StatTone = "blue" | "orange" | "purple" | "pink" | "sky" | "emerald";

export type Stat = {
  icon: IconComponent;
  label: string;
  value: string;
  /** Omit to hide the delta pill (e.g. stock metrics with a self-explanatory caption). */
  delta?: string;
  /** Pill sentiment; the arrow glyph follows `deltaDirection` (falling back
   *  to the sign of `delta`). Defaults to neutral when omitted. */
  deltaColor?: "lime" | "rose" | "neutral";
  /** Which way the underlying metric moved — drives the arrow glyph, so
   *  prose labels like "20% slower" can still point the right way. */
  deltaDirection?: "up" | "down" | "flat";
  /** Footer variant: icon tile tint (defaults to blue). */
  tone?: StatTone;
  /** Footer variant: comparison caption in the band ("From last month"). */
  caption?: string;
  /** Footer variant: shows an info glyph with this text on hover. */
  hint?: string;
};

const DEFAULT_STATS: Stat[] = [
  { icon: RiGroupLine, label: "Customers", value: "14,592", delta: "+5.3%", deltaColor: "lime" },
  { icon: RiBox3Line, label: "Unit sold", value: "385", delta: "-2.1%", deltaColor: "rose" },
  { icon: RiShoppingBasketLine, label: "Orders", value: "1,394", delta: "0.00%", deltaColor: "neutral" },
  { icon: RiChatSmile2Line, label: "Support tickets", value: "708", delta: "+12.8%", deltaColor: "lime" },
];

const DEFAULT_FOOTER_STATS: Stat[] = [
  {
    icon: RiCoinsFill,
    label: "Total revenue",
    value: "$152,313.92",
    delta: "16%",
    deltaColor: "lime",
    tone: "blue",
    hint: "Gross revenue across every channel this month, before refunds. The change is against the same days last month.",
  },
  {
    icon: RiShoppingBasket2Fill,
    label: "Total orders",
    value: "25,162",
    delta: "20%",
    deltaColor: "lime",
    tone: "orange",
    hint: "Checkouts completed this month, repeat purchases included. The change is against the same days last month.",
  },
  {
    icon: RiGroupFill,
    label: "New customers",
    value: "3,847",
    delta: "8.1%",
    deltaColor: "lime",
    tone: "purple",
    hint: "People who bought for the first time this month. The change is against the same days last month.",
  },
  {
    icon: RiRefund2Fill,
    label: "Refunds",
    value: "$4,209.44",
    delta: "2.4%",
    deltaColor: "rose",
    tone: "pink",
    hint: "Value of orders refunded this month. Down is good here, so the change reads in red when refunds rise.",
  },
];

/** Gradient stops for the footer variant's icon tile, keyed by tone. */
const TILE_TONES: Record<StatTone, string> = {
  blue: "from-blue-500 to-blue-600",
  orange: "from-orange-400 to-orange-500",
  purple: "from-purple-500 to-purple-600",
  pink: "from-pink-500 to-pink-600",
  sky: "from-sky-400 to-sky-500",
  emerald: "from-emerald-500 to-emerald-600",
};

/** Pill tint by sentiment — the footer band's delta readout. The glyph is
 *  chosen separately from the metric's direction so they can disagree. */
const DELTA_STYLES: Record<
  NonNullable<Stat["deltaColor"]>,
  { className: string }
> = {
  lime: {
    className: "bg-success/10 text-success",
  },
  rose: {
    className: "bg-destructive/10 text-destructive",
  },
  neutral: {
    className: "bg-muted text-muted-foreground",
  },
};

function DeltaPill({
  delta,
  deltaColor,
  deltaDirection,
}: Pick<Stat, "delta" | "deltaColor" | "deltaDirection">) {
  if (!delta) return null;

  const sentiment = deltaColor ?? "neutral";
  const { className } = DELTA_STYLES[sentiment];
  // Arrow shows which way the metric moved; color shows whether that was
  // good. They can disagree on purpose: a lime "33% faster" points down.
  const direction =
    deltaDirection ??
    (delta.trimStart().startsWith("−")
      ? "down"
      : delta.trimStart().startsWith("+")
        ? "up"
        : "flat");
  const Icon =
    direction === "down"
      ? RiArrowDownCircleFill
      : direction === "up"
        ? RiArrowUpCircleFill
        : RiIndeterminateCircleFill;

  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full py-0.5 pr-2 pl-1",
        className,
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="whitespace-nowrap text-xs font-medium tabular-nums">
        {delta}
      </span>
    </span>
  );
}

/** Bare info glyph with a tooltip — the footer header's trailing control. */
function StatHint({ label, hint }: { label: string; hint: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`About ${label}`}
            className="flex shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RiInformationFill className="size-4" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[240px]">{hint}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function PlainStatCard({ stat }: { stat: Stat }) {
  return (
    <section className="flex h-[132px] min-w-0 flex-col items-start justify-between rounded-xl border border-border/60 bg-card p-4">
      <span className="flex items-center rounded-md bg-muted p-1.5">
        <stat.icon className="size-5 shrink-0 text-foreground" aria-hidden />
      </span>
      <div className="flex w-full flex-col gap-0.5">
        <p className="w-full text-sm font-medium text-muted-foreground">{stat.label}</p>
        <div className="flex w-full flex-wrap items-center gap-2">
          <p className="whitespace-nowrap text-2xl font-semibold tracking-tight text-foreground">
            {stat.value}
          </p>
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap",
              DELTA_STYLES[stat.deltaColor ?? "neutral"].className,
            )}
          >
            {stat.delta}
          </span>
        </div>
      </div>
    </section>
  );
}

function FooterStatCard({ stat }: { stat: Stat }) {
  return (
    <section className="flex min-w-0 flex-col rounded-2xl border border-border/60 bg-card p-2">
      {/* Icon tile + optional info glyph, both hanging from the same top inset */}
      <div className="flex w-full items-start justify-between gap-2.5 p-2">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-b",
            TILE_TONES[stat.tone ?? "blue"],
          )}
        >
          <stat.icon className="size-5 shrink-0 text-white" aria-hidden />
        </span>
        {stat.hint && <StatHint label={stat.label} hint={stat.hint} />}
      </div>

      {/* Label sits directly over the number, as on the plain cards */}
      <div className="flex flex-col gap-0.5 px-2 pt-2.5 pb-3.5">
        <p className="truncate text-sm font-medium text-muted-foreground">{stat.label}</p>
        <p className="whitespace-nowrap text-2xl font-semibold tracking-tight text-foreground tabular-nums">
          {stat.value}
        </p>
      </div>

      {/* Footer band: comparison caption + delta pill on an inner tile */}
      <div className="mt-auto flex w-full items-center justify-between gap-2 rounded-xl bg-muted py-1.5 pr-1.5 pl-2.5">
        <p className="truncate text-xs text-muted-foreground">
          {stat.caption ?? "From last month"}
        </p>
        <DeltaPill
          delta={stat.delta}
          deltaColor={stat.deltaColor}
          deltaDirection={stat.deltaDirection}
        />
      </div>
    </section>
  );
}

export function StatCards({
  variant = "plain",
  stats,
  count,
  columns = 4,
  className,
}: {
  variant?: StatCardsVariant;
  /** KPI cards to render; defaults to demo metrics matching the variant. */
  stats?: Stat[];
  /** How many KPI cards to render (from the start of the list). */
  count?: number;
  /** Columns at the widest breakpoint - 2 keeps the grid two-up for
   *  narrower hosts (docs previews, split layouts), 1 pins a single
   *  column at every width. */
  columns?: 1 | 2 | 4;
  className?: string;
} = {}) {
  const items = stats ?? (variant === "footer" ? DEFAULT_FOOTER_STATS : DEFAULT_STATS);
  return (
    <div
      className={cn(
        "grid w-full gap-4",
        // The footer cards carry a display-size value, so they go one per
        // row on phones where the plain cards still fit two up.
        columns === 1
          ? "grid-cols-1"
          : variant === "footer"
            ? "grid-cols-1 sm:grid-cols-2"
            : "grid-cols-2",
        columns === 4 && (variant === "footer" ? "xl:grid-cols-4" : "lg:grid-cols-4"),
        className,
      )}
    >
      {items.slice(0, count ?? items.length).map((stat) =>
        variant === "footer" ? (
          <FooterStatCard key={stat.label} stat={stat} />
        ) : (
          <PlainStatCard key={stat.label} stat={stat} />
        ),
      )}
    </div>
  );
}
