"use client";

import { Search, X } from "lucide-react";
import type { ReactNode } from "react";

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
    <div className="toolbar-panel">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          <p className="text-sm font-medium text-foreground">{resultLabel}</p>
        </div>

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <FieldGroup className="lg:flex-row lg:items-end">
            <Field className="lg:flex-1">
              <FieldLabel className="sr-only" htmlFor={searchId}>
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

            <Field className="lg:w-[13rem]">
              <FieldLabel className="sr-only" htmlFor={filterId}>
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

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button disabled={isPending} type="submit">
                <Search data-icon="inline-start" />
                {isPending ? "Applying..." : "Apply"}
              </Button>
              <Button
                disabled={isPending || !canClear}
                onClick={onClear}
                type="button"
                variant="outline"
              >
                <X data-icon="inline-start" />
                Clear
              </Button>
            </div>
          </FieldGroup>
        </form>
      </div>
    </div>
  );
}
