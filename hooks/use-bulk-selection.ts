"use client";

import { useCallback, useMemo, useState } from "react";

const DEFAULT_MAX_SELECTION = 50;

export function useBulkSelection<T extends { id: string }>(
  items: T[],
  maxSelection = DEFAULT_MAX_SELECTION,
) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else if (next.size < maxSelection) {
          next.add(id);
        }
        return next;
      });
    },
    [maxSelection],
  );

  const selectAll = useCallback(
    (ids: string[]) => {
      setSelectedIds(new Set(ids.slice(0, maxSelection)));
    },
    [maxSelection],
  );

  const deselectAll = useCallback(() => setSelectedIds(new Set()), []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds],
  );

  const isAtLimit = selectedIds.size >= maxSelection;

  const serializedIds = useMemo(
    () => Array.from(selectedIds).join(","),
    [selectedIds],
  );

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    isSelected,
    toggle,
    selectAll,
    deselectAll,
    isAtLimit,
    serializedIds,
  };
}
