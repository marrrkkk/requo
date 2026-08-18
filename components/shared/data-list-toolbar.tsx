"use client";

import { ListFilter, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import {
  DashboardActionsRow,
  DashboardToolbar,
} from "@/components/shared/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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
  secondaryFilterId?: string;
  secondaryFilterLabel?: string;
  secondaryFilterValue?: string;
  onSecondaryFilterChange?: (value: string) => void;
  secondaryFilterOptions?: DataListToolbarOption[];
  sortId?: string;
  sortLabel?: string;
  sortValue?: string;
  onSortChange?: (value: string) => void;
  sortOptions?: DataListToolbarOption[];
  isPending: boolean;
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
  secondaryFilterId,
  secondaryFilterLabel,
  secondaryFilterValue,
  onSecondaryFilterChange,
  secondaryFilterOptions,
  sortId,
  sortLabel,
  sortValue,
  onSortChange,
  sortOptions,
  isPending,
  onClear,
  canClear,
}: DataListToolbarProps) {
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const shouldShowSecondaryFilter = Boolean(
    secondaryFilterId &&
      secondaryFilterLabel &&
      secondaryFilterValue !== undefined &&
      onSecondaryFilterChange &&
      secondaryFilterOptions?.length,
  );
  const shouldShowSortFilter = Boolean(
    sortId &&
      sortLabel &&
      sortValue !== undefined &&
      onSortChange &&
      sortOptions?.length,
  );

  const filterFields = useMemo(
    () => (
      <>
        <Field className="min-w-0 w-full sm:max-w-[14rem] xl:w-[12rem] xl:max-w-[14rem] xl:shrink-0">
          <FieldLabel className="meta-label px-0.5" htmlFor={filterId}>
            {filterLabel}
          </FieldLabel>
          <FieldContent>
            <Combobox
              id={filterId}
              value={filterValue}
              onValueChange={(value) => {
                onFilterChange(value);
              }}
              options={filterOptions}
              placeholder={filterLabel}
              searchPlaceholder={`Search ${filterLabel.toLowerCase()}`}
            />
          </FieldContent>
        </Field>

        {shouldShowSecondaryFilter ? (
          <Field className="min-w-0 w-full sm:max-w-[14rem] xl:w-[12rem] xl:max-w-[14rem] xl:shrink-0">
            <FieldLabel className="meta-label px-0.5" htmlFor={secondaryFilterId}>
              {secondaryFilterLabel}
            </FieldLabel>
            <FieldContent>
              <Combobox
                id={secondaryFilterId!}
                value={secondaryFilterValue!}
                onValueChange={(value) => {
                  onSecondaryFilterChange!(value);
                }}
                options={secondaryFilterOptions!}
                placeholder={secondaryFilterLabel!}
                searchPlaceholder={`Search ${secondaryFilterLabel!.toLowerCase()}`}
              />
            </FieldContent>
          </Field>
        ) : null}

        {shouldShowSortFilter ? (
          <Field className="min-w-0 w-full sm:max-w-[14rem] xl:w-[12rem] xl:max-w-[14rem] xl:shrink-0">
            <FieldLabel className="meta-label px-0.5" htmlFor={sortId}>
              {sortLabel}
            </FieldLabel>
            <FieldContent>
              <Combobox
                id={sortId!}
                value={sortValue!}
                onValueChange={(value) => {
                  onSortChange!(value);
                }}
                options={sortOptions!}
                placeholder={sortLabel!}
                searchPlaceholder={`Search ${sortLabel!.toLowerCase()}`}
              />
            </FieldContent>
          </Field>
        ) : null}
      </>
    ),
    [
      filterId,
      filterLabel,
      filterOptions,
      filterValue,
      onFilterChange,
      onSecondaryFilterChange,
      onSortChange,
      secondaryFilterId,
      secondaryFilterLabel,
      secondaryFilterOptions,
      secondaryFilterValue,
      shouldShowSecondaryFilter,
      shouldShowSortFilter,
      sortId,
      sortLabel,
      sortOptions,
      sortValue,
    ],
  );

  return (
    <DashboardToolbar>
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="data-list-toolbar-summary">
          <p className="hidden text-sm leading-6 text-muted-foreground sm:block">{description}</p>
          <div className="flex w-full items-center justify-between sm:w-auto">
            <p className="data-list-toolbar-count">{resultLabel}</p>
            {canClear ? (
              <Button
                className="h-7 px-2 text-xs sm:hidden"
                onClick={onClear}
                type="button"
                variant="ghost"
              >
                <X data-icon="inline-start" className="size-3.5" />
                Clear
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="data-list-toolbar-grid">
            <div className="flex min-w-0 w-full items-end gap-2 xl:min-w-[10rem] xl:max-w-md xl:flex-1 xl:basis-0">
              <Field className="min-w-0 flex-1">
                <FieldLabel className="meta-label px-0.5" htmlFor={searchId}>
                  {searchLabel}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id={searchId}
                    value={searchValue}
                    onChange={(event) => onSearchChange(event.currentTarget.value)}
                    placeholder={searchPlaceholder}
                    aria-busy={isPending}
                  />
                </FieldContent>
              </Field>

              {/* Mobile Filter Button alongside search */}
              <div className="sm:hidden">
                <Sheet open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button
                      aria-label="Filter records"
                      className="size-9 shrink-0 px-0"
                      type="button"
                      variant="outline"
                    >
                      <ListFilter className="size-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom">
                    <SheetHeader>
                      <SheetTitle>Filters</SheetTitle>
                      <SheetDescription>
                        Narrow list results with status, form, and sort options.
                      </SheetDescription>
                    </SheetHeader>
                    <SheetBody className="gap-4">{filterFields}</SheetBody>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            <div className="hidden sm:contents">{filterFields}</div>

            <DashboardActionsRow className="data-list-toolbar-actions hidden sm:flex">
              <Button className="shrink-0 sm:w-auto" disabled={!canClear} onClick={onClear} type="button" variant="ghost">
                <X data-icon="inline-start" />
                Clear
              </Button>
              {isPending ? <Spinner className="inline-flex" aria-hidden="true" /> : null}
            </DashboardActionsRow>
          </div>
        </div>
      </div>
    </DashboardToolbar>
  );
}
