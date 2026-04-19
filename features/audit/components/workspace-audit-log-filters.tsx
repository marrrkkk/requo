import { SearchX } from "lucide-react";

import { DashboardActionsRow, DashboardSection } from "@/components/shared/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuditLogFilters, WorkspaceAuditLogFiltersView } from "@/features/audit/types";

type WorkspaceAuditLogFiltersProps = {
  action: string;
  filters: AuditLogFilters;
  options: WorkspaceAuditLogFiltersView;
};

function FilterSelect({
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
  return (
    <select
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20"
      defaultValue={value ?? ""}
      name={name}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function WorkspaceAuditLogFilters({
  action,
  filters,
  options,
}: WorkspaceAuditLogFiltersProps) {
  return (
    <DashboardSection
      description="Filter by actor, business, action, entity, or date range to find meaningful accountability events."
      title="Filters"
    >
      <form action={action} className="grid gap-4 lg:grid-cols-3">
        <FilterSelect
          name="actor"
          options={options.actors}
          placeholder="All actors"
          value={filters.actor}
        />
        <FilterSelect
          name="business"
          options={options.businesses}
          placeholder="All businesses"
          value={filters.business}
        />
        <FilterSelect
          name="entity"
          options={options.entities}
          placeholder="All entities"
          value={filters.entity}
        />
        <FilterSelect
          name="action"
          options={options.actions}
          placeholder="All actions"
          value={filters.action}
        />
        <Input defaultValue={filters.from ?? ""} name="from" type="date" />
        <Input defaultValue={filters.to ?? ""} name="to" type="date" />
        <input name="page" type="hidden" value="1" />
        <DashboardActionsRow className="lg:col-span-3 lg:justify-end">
          <Button type="submit">Apply filters</Button>
          <Button asChild variant="ghost">
            <a href={action}>
              <SearchX data-icon="inline-start" className="size-4" />
              Clear
            </a>
          </Button>
        </DashboardActionsRow>
      </form>
    </DashboardSection>
  );
}
