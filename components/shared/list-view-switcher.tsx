import Link from "next/link";

import { cn } from "@/lib/utils";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type ListViewSwitcherProps = {
  currentValue: string;
  defaultValue: string;
  options: Array<{
    label: string;
    value: string;
  }>;
  pathname: string;
  searchParams: SearchParamsRecord;
  paramName?: string;
  className?: string;
};

function buildSearchParams(searchParams: SearchParamsRecord) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        params.append(key, entry);
      }

      continue;
    }

    if (typeof value === "string") {
      params.set(key, value);
    }
  }

  return params;
}

export function ListViewSwitcher({
  currentValue,
  defaultValue,
  options,
  pathname,
  searchParams,
  paramName = "view",
  className,
}: ListViewSwitcherProps) {
  return (
    <div
      className={cn(
        "inline-flex w-full flex-wrap gap-1 rounded-lg border border-border/80 bg-[var(--table-header-bg)] p-1 sm:w-auto",
        className,
      )}
    >
      {options.map((option) => {
        const params = buildSearchParams(searchParams);

        if (option.value === defaultValue) {
          params.delete(paramName);
        } else {
          params.set(paramName, option.value);
        }

        params.delete("page");

        const href = params.size ? `${pathname}?${params.toString()}` : pathname;
        const isActive = option.value === currentValue;

        return (
          <Link
            className={cn(
              "inline-flex min-h-9 flex-1 items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none",
              isActive
                ? "border-border/80 bg-[var(--control-bg)] text-foreground shadow-[var(--control-shadow)]"
                : "border-transparent text-foreground/65 hover:text-foreground",
            )}
            href={href}
            key={option.value}
            prefetch={true}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
