"use client";

import { X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useProgressRouter } from "@/hooks/use-progress-router";

export type AdminToolbarOption = {
  value: string;
  label: string;
};

export type AdminToolbarField =
  | { kind: "text"; key: string; label: string; placeholder?: string }
  | {
      kind: "select";
      key: string;
      label: string;
      allLabel: string;
      options: AdminToolbarOption[];
    }
  | { kind: "date"; key: string; label: string };

type AdminListToolbarProps = {
  /**
   * URL key for the search box (every admin toolbar uses `q`). Omit to
   * render a filters-only toolbar with no search box.
   */
  searchKey?: string;
  searchLabel?: string;
  searchPlaceholder?: string;
  /** Extra filter controls; order is render order. */
  fields: AdminToolbarField[];
  /** Current URL-derived values (`""` = unset) for search + every field key. */
  values: Record<string, string>;
  resultLabel: ReactNode;
  description?: ReactNode;
};

/**
 * Multi-filter toolbar for admin pages that outgrow `DataListToolbar`
 * (search + 3 filters + sort).
 *
 * Config-driven: pages declare text / select / date fields and this
 * component owns the URL sync — debounced for text and dates, immediate
 * for selects, page reset on every change, unknown params preserved.
 * Always-visible responsive grid (no mobile sheet): the admin console is
 * an internal tool where density beats chrome.
 */
export function AdminListToolbar({
  searchKey,
  searchLabel,
  searchPlaceholder,
  fields,
  values,
  resultLabel,
  description,
}: AdminListToolbarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useProgressRouter();
  const [isPending, startTransition] = useTransition();

  const readValues = useCallback((): Record<string, string> => {
    const next: Record<string, string> = {};

    if (searchKey) {
      next[searchKey] = values[searchKey] ?? "";
    }

    for (const field of fields) {
      next[field.key] = values[field.key] ?? "";
    }

    return next;
  }, [fields, searchKey, values]);

  const [draft, setDraft] = useState<Record<string, string>>(readValues);
  const hasMountedRef = useRef(false);
  const lastAppliedHrefRef = useRef<string>("");

  const navigate = useCallback(
    (next: Record<string, string>) => {
      const params = new URLSearchParams();
      const managed = new Set([
        ...(searchKey ? [searchKey] : []),
        "page",
        ...fields.map((f) => f.key),
      ]);

      for (const [key, value] of searchParams.entries()) {
        if (managed.has(key)) {
          continue;
        }
        params.append(key, value);
      }

      if (searchKey) {
        const searchValue = (next[searchKey] ?? "").trim();

        if (searchValue) {
          params.set(searchKey, searchValue);
        }
      }

      for (const field of fields) {
        const value = (next[field.key] ?? "").trim();

        if (value) {
          params.set(field.key, value);
        }
      }

      const href = params.size ? `${pathname}?${params.toString()}` : pathname;
      const currentHref = searchParams.size
        ? `${pathname}?${searchParams.toString()}`
        : pathname;

      if (href === currentHref || href === lastAppliedHrefRef.current) {
        return;
      }

      lastAppliedHrefRef.current = href;

      startTransition(() => {
        router.replace(href, { scroll: false });
      });
    },
    [fields, pathname, router, searchParams, searchKey],
  );

  // Sync local state when the URL changes without an effect (back/forward,
  // server re-render with new values).
  const [prevValues, setPrevValues] = useState(values);

  if (values !== prevValues) {
    setPrevValues(values);
    setDraft(readValues());
  }

  // Text and date fields commit debounced; selects commit immediately via
  // their own onChange below.
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    const timer = setTimeout(() => {
      navigate(draft);
    }, 400);

    return () => clearTimeout(timer);
  }, [navigate, draft]);

  const canClear = Object.values(draft).some((value) => value.trim() !== "");

  function clearAll() {
    const cleared: Record<string, string> = {};

    if (searchKey) {
      cleared[searchKey] = "";
    }

    for (const field of fields) {
      cleared[field.key] = "";
    }

    setDraft(cleared);
    navigate(cleared);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        {searchKey ? (
          <Field>
            <FieldLabel htmlFor={`admin-toolbar-${searchKey}`}>
              {searchLabel}
            </FieldLabel>
            <FieldContent>
              <Input
                id={`admin-toolbar-${searchKey}`}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    [searchKey]: event.currentTarget.value,
                  }))
                }
                placeholder={searchPlaceholder}
                type="search"
                value={draft[searchKey] ?? ""}
              />
            </FieldContent>
          </Field>
        ) : (
          <div className="hidden lg:block" />
        )}
        <div className="flex items-center gap-2">
          {isPending ? <Spinner aria-hidden="true" /> : null}
          <p className="text-sm text-muted-foreground tabular-nums">
            {resultLabel}
          </p>
          {canClear ? (
            <Button onClick={clearAll} size="sm" type="button" variant="ghost">
              <X data-icon="inline-start" />
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {fields.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {fields.map((field) =>
            field.kind === "select" ? (
              <Field key={field.key}>
                <FieldLabel htmlFor={`admin-toolbar-${field.key}`}>
                  {field.label}
                </FieldLabel>
                <FieldContent>
                  <Combobox
                    id={`admin-toolbar-${field.key}`}
                    onValueChange={(value) => {
                      const next = { ...draft, [field.key]: value };
                      setDraft(next);
                      navigate(next);
                    }}
                    options={[
                      { label: field.allLabel, value: "" },
                      ...field.options,
                    ]}
                    placeholder={field.allLabel}
                    value={draft[field.key] ?? ""}
                  />
                </FieldContent>
              </Field>
            ) : field.kind === "date" ? (
              <Field key={field.key}>
                <FieldLabel htmlFor={`admin-toolbar-${field.key}`}>
                  {field.label}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id={`admin-toolbar-${field.key}`}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        [field.key]: event.currentTarget.value,
                      }))
                    }
                    type="date"
                    value={draft[field.key] ?? ""}
                  />
                </FieldContent>
              </Field>
            ) : (
              <Field key={field.key}>
                <FieldLabel htmlFor={`admin-toolbar-${field.key}`}>
                  {field.label}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id={`admin-toolbar-${field.key}`}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        [field.key]: event.currentTarget.value,
                      }))
                    }
                    placeholder={field.placeholder}
                    type="text"
                    value={draft[field.key] ?? ""}
                  />
                </FieldContent>
              </Field>
            ),
          )}
        </div>
      ) : null}

      {description ? (
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
