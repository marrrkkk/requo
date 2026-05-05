"use client";

import { useMemo } from "react";
import { useProgressRouter } from "@/hooks/use-progress-router";

import { Combobox } from "@/components/ui/combobox";
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
  const router = useProgressRouter();
  const comboboxOptions = useMemo(
    () =>
      options.map((option) => ({
        ...option,
        searchText: `${option.label} ${option.value}`,
      })),
    [options],
  );

  function getViewHref(nextValue: string) {
    const params = buildSearchParams(searchParams);

    if (nextValue === defaultValue) {
      params.delete(paramName);
    } else {
      params.set(paramName, nextValue);
    }

    params.delete("page");

    return params.size ? `${pathname}?${params.toString()}` : pathname;
  }

  return (
    <div className={cn("w-full sm:w-auto", className)}>
      <Combobox
        buttonClassName="w-full min-w-0 sm:min-w-[10.5rem]"
        id={`list-view-switcher-${paramName}`}
        onValueChange={(nextValue) => {
          if (nextValue === currentValue) {
            return;
          }

          router.push(getViewHref(nextValue), { scroll: false });
        }}
        options={comboboxOptions}
        placeholder="Choose a view"
        value={currentValue}
      />
    </div>
  );
}
