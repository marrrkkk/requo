"use client";

import { Search, X } from "lucide-react";
import type { ReactNode } from "react";

import {
  DashboardActionsRow,
  DashboardToolbar,
} from "@/components/shared/dashboard-layout";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DataListToolbarOption = {
  label: string;
  value: string;
};

type DataListToolbarProps = {
  description: ReactNode;
  resultLabel: ReactNode;
  searchId: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filterId: string;
  filterLabel: string;
  filterValue: string;
  onFilterChange: (value: string) => void;
  filterOptions: DataListToolbarOption[];
  isPending: boolean;
  onSubmit: () => void;
  onClear: () => void;
  canClear: boolean;
};

export function DataListToolbar({
  description,
  resultLabel,
  searchId,
  searchLabel,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  filterId,
  filterLabel,
  filterValue,
  onFilterChange,
  filterOptions,
  isPending,
  onSubmit,
  onClear,
  canClear,
}: DataListToolbarProps) {
  return (
    <DashboardToolbar>
      <div className="flex flex-col gap-4">
        <div className="data-list-toolbar-summary">
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          <p className="data-list-toolbar-count">{resultLabel}</p>
        </div>

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <FieldGroup className="data-list-toolbar-grid gap-4">
            <Field className="xl:min-w-0">
              <FieldLabel className="meta-label px-0.5" htmlFor={searchId}>
                {searchLabel}
              </FieldLabel>
              <FieldContent>
                <Input
                  id={searchId}
                  value={searchValue}
                  onChange={(event) => onSearchChange(event.currentTarget.value)}
                  placeholder={searchPlaceholder}
                  disabled={isPending}
                />
              </FieldContent>
            </Field>

            <Field className="sm:max-w-[14rem] xl:max-w-none">
              <FieldLabel className="meta-label px-0.5" htmlFor={filterId}>
                {filterLabel}
              </FieldLabel>
              <FieldContent>
                <Select value={filterValue} onValueChange={onFilterChange}>
                  <SelectTrigger id={filterId} className="w-full">
                    <SelectValue placeholder={filterLabel} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {filterOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>

            <DashboardActionsRow className="data-list-toolbar-actions lg:self-end">
              <Button className="w-full sm:w-auto" disabled={isPending} type="submit">
                <Search data-icon="inline-start" />
                {isPending ? "Applying..." : "Apply filters"}
              </Button>
              <Button
                className="w-full sm:w-auto"
                disabled={isPending || !canClear}
                onClick={onClear}
                type="button"
                variant="ghost"
              >
                <X data-icon="inline-start" />
                Clear
              </Button>
            </DashboardActionsRow>
          </FieldGroup>
        </form>
      </div>
    </DashboardToolbar>
  );
}
