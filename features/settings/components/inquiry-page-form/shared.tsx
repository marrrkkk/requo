"use client";

import { useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { LockedAction } from "@/features/paywall";
import type { BusinessPlan } from "@/lib/plans/plans";
import { cn } from "@/lib/utils";

export function SectionHeading({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

export function DetailsPanel({
  children,
  description,
  eyebrow,
  title,
}: {
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="soft-panel px-5 py-6 shadow-none sm:p-8">
      <div className="space-y-1.5">
        <p className="meta-label">{eyebrow}</p>
        <p className="font-heading text-lg font-semibold tracking-tight text-foreground">
          {title}
        </p>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <div className="mt-7">{children}</div>
    </div>
  );
}

export function DisclosureSection({
  children,
  description,
  label,
}: {
  children: ReactNode;
  description?: string;
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-2 border-t border-border/70 pt-4">
      <button
        className="group flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent/40"
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
      >
        <div className="min-w-0 space-y-0.5">
          <p className="text-[0.95rem] font-semibold tracking-tight text-foreground">
            {label}
          </p>
          {description ? (
            <p className="text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>
      {isOpen ? (
        <div className="mt-4 flex flex-col gap-6">{children}</div>
      ) : null}
    </div>
  );
}

export function OptionTileGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

export function OptionTile({
  description,
  disabled,
  isSelected,
  label,
  locked,
  plan,
  selectedLabel,
  onClick,
}: {
  description: string;
  disabled: boolean;
  isSelected: boolean;
  label: string;
  locked?: boolean;
  plan?: BusinessPlan;
  selectedLabel: string;
  onClick: () => void;
}) {
  const tile = (
    <button
      aria-pressed={isSelected}
      className={cn(
        "soft-panel flex min-h-24 w-full flex-col items-start justify-between gap-3 px-4 py-3 text-left shadow-none transition-[border-color,background-color,box-shadow]",
        isSelected
          ? "border-primary/30 bg-accent/50 ring-1 ring-primary/15"
          : "hover:bg-accent/25",
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <div className="flex w-full min-w-0 items-center gap-3">
        <span className="min-w-0 flex-1 text-sm font-semibold tracking-tight text-foreground">
          {label}
        </span>
        {isSelected ? (
          <>
            <span className="sr-only">{selectedLabel}</span>
            <span
              aria-hidden="true"
              className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-background/90 text-primary"
            >
              <Check className="size-3" />
            </span>
          </>
        ) : null}
      </div>
      <span className="text-xs leading-5 text-muted-foreground">
        {description}
      </span>
    </button>
  );

  if (locked && plan) {
    return (
      <LockedAction feature="inquiryPageCustomization" plan={plan}>
        {tile}
      </LockedAction>
    );
  }

  return tile;
}

export function SectionVisibilityToggle({
  checked,
  description,
  disabled,
  label,
  locked,
  plan,
  onCheckedChange,
}: {
  checked: boolean;
  description: string;
  disabled: boolean;
  label: string;
  locked?: boolean;
  plan?: BusinessPlan;
  onCheckedChange: (nextValue: boolean) => void;
}) {
  const switchElement = (
    <Switch
      checked={checked}
      disabled={disabled}
      onCheckedChange={onCheckedChange}
    />
  );

  return (
    <label className="soft-panel flex flex-col gap-5 px-5 py-5 shadow-none sm:flex-row sm:items-center sm:justify-between sm:p-7">
      <div className="min-w-0 space-y-1.5">
        <p className="text-[0.95rem] font-semibold text-foreground">{label}</p>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {locked && plan ? (
        <LockedAction feature="inquiryPageCustomization" plan={plan}>
          {switchElement}
        </LockedAction>
      ) : (
        switchElement
      )}
    </label>
  );
}

export function BuilderSection({
  action,
  children,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      {action ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="meta-label">{title}</p>
          <div className="w-full shrink-0 sm:w-auto">{action}</div>
        </div>
      ) : (
        <p className="meta-label">{title}</p>
      )}
      <div className="flex flex-col gap-5">{children}</div>
    </div>
  );
}
