"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useState } from "react";

import { DashboardActionsRow, DashboardSection } from "@/components/shared/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import type { AuditLogFilters, WorkspaceAuditLogFiltersView } from "@/features/audit/types";
import { useProgressRouter } from "@/hooks/use-progress-router";

type WorkspaceAuditLogFiltersProps = {
  action: string;
  filters: AuditLogFilters;
  options: WorkspaceAuditLogFiltersView;
};

function FilterCombobox({
  name,
  value,
  placeholder,
  options,
}: {
  name: string;
  value: string | null;
  placeholder: string;
  options: Array<{
    value: string;
    label: string;
  }>;
}) {
  const [val, setVal] = useState(value ?? "");
  return (
    <>
      <input type="hidden" name={name} value={val} />
      <Combobox
        id={name}
        value={val}
        onValueChange={setVal}
        options={options}
        placeholder={placeholder}
        searchPlaceholder={`Search ${placeholder.toLowerCase()}`}
      />
    </>
  );
}

function FilterDatePicker({
  name,
  value,
  placeholder,
}: {
  name: string;
  value: string | null;
  placeholder: string;
}) {
  const [val, setVal] = useState(value ?? "");
  return (
    <DatePicker
      id={name}
      name={name}
      value={val}
      onChange={setVal}
      placeholder={placeholder}
    />
  );
}

export function WorkspaceAuditLogFilters({
  action,
  filters,
  options,
}: WorkspaceAuditLogFiltersProps) {
  const router = useProgressRouter();
  const hasFilters = Boolean(filters.actor || filters.business || filters.entity || filters.action || filters.from || filters.to);

  return (
    <DashboardSection
      description="Filter by actor, business, action, entity, or date range to find meaningful accountability events."
      title="Filters"
    >
      <form
        action={action}
        className="grid gap-4 lg:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const params = new URLSearchParams();
          for (const [key, value] of formData.entries()) {
            if (value && typeof value === "string") {
              params.set(key, value);
            }
          }
          router.push(`${action}?${params.toString()}`);
        }}
      >
        <FilterCombobox
          name="actor"
          options={options.actors}
          placeholder="All actors"
          value={filters.actor}
        />
        <FilterCombobox
          name="business"
          options={options.businesses}
          placeholder="All businesses"
          value={filters.business}
        />
        <FilterCombobox
          name="entity"
          options={options.entities}
          placeholder="All entities"
          value={filters.entity}
        />
        <FilterCombobox
          name="action"
          options={options.actions}
          placeholder="All actions"
          value={filters.action}
        />
        <FilterDatePicker name="from" placeholder="From date" value={filters.from} />
        <FilterDatePicker name="to" placeholder="To date" value={filters.to} />
        <input name="page" type="hidden" value="1" />
        <DashboardActionsRow className="lg:col-span-3 lg:justify-end">
          <Button type="submit">Apply filters</Button>
          <Button asChild variant="ghost" disabled={!hasFilters}>
            <Link href={action} prefetch={true} className={!hasFilters ? "pointer-events-none opacity-50" : ""}>
              <X data-icon="inline-start" className="size-4" />
              Clear
            </Link>
          </Button>
        </DashboardActionsRow>
      </form>
    </DashboardSection>
  );
}
