import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useBulkSelection } from "@/hooks/use-bulk-selection";

const makeItems = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: `item-${i}` }));

describe("useBulkSelection", () => {
  it("starts with no items selected", () => {
    const { result } = renderHook(() => useBulkSelection(makeItems(5)));

    expect(result.current.selectedCount).toBe(0);
    expect(result.current.serializedIds).toBe("");
    expect(result.current.isAtLimit).toBe(false);
  });

  it("toggles an item on and off", () => {
    const { result } = renderHook(() => useBulkSelection(makeItems(5)));

    act(() => result.current.toggle("item-0"));
    expect(result.current.isSelected("item-0")).toBe(true);
    expect(result.current.selectedCount).toBe(1);

    act(() => result.current.toggle("item-0"));
    expect(result.current.isSelected("item-0")).toBe(false);
    expect(result.current.selectedCount).toBe(0);
  });

  it("selects all provided IDs", () => {
    const { result } = renderHook(() => useBulkSelection(makeItems(5)));

    act(() => result.current.selectAll(["item-0", "item-1", "item-2"]));
    expect(result.current.selectedCount).toBe(3);
    expect(result.current.isSelected("item-0")).toBe(true);
    expect(result.current.isSelected("item-1")).toBe(true);
    expect(result.current.isSelected("item-2")).toBe(true);
  });

  it("deselects all items", () => {
    const { result } = renderHook(() => useBulkSelection(makeItems(5)));

    act(() => result.current.selectAll(["item-0", "item-1"]));
    act(() => result.current.deselectAll());
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.serializedIds).toBe("");
  });

  it("enforces max selection limit of 50 by default", () => {
    const items = makeItems(60);
    const { result } = renderHook(() => useBulkSelection(items));

    // Select all 60 IDs — should cap at 50
    act(() => result.current.selectAll(items.map((i) => i.id)));
    expect(result.current.selectedCount).toBe(50);
    expect(result.current.isAtLimit).toBe(true);
  });

  it("prevents toggle when at limit", () => {
    const items = makeItems(51);
    const { result } = renderHook(() => useBulkSelection(items));

    // Select 50 items
    act(() => result.current.selectAll(items.slice(0, 50).map((i) => i.id)));
    expect(result.current.isAtLimit).toBe(true);

    // Try to toggle one more — should not add
    act(() => result.current.toggle("item-50"));
    expect(result.current.selectedCount).toBe(50);
    expect(result.current.isSelected("item-50")).toBe(false);
  });

  it("allows toggle off when at limit", () => {
    const items = makeItems(50);
    const { result } = renderHook(() => useBulkSelection(items));

    act(() => result.current.selectAll(items.map((i) => i.id)));
    expect(result.current.isAtLimit).toBe(true);

    // Toggle off an existing item — should work
    act(() => result.current.toggle("item-0"));
    expect(result.current.selectedCount).toBe(49);
    expect(result.current.isAtLimit).toBe(false);
  });

  it("respects custom max selection limit", () => {
    const items = makeItems(10);
    const { result } = renderHook(() => useBulkSelection(items, 3));

    act(() => result.current.toggle("item-0"));
    act(() => result.current.toggle("item-1"));
    act(() => result.current.toggle("item-2"));
    expect(result.current.isAtLimit).toBe(true);

    // Cannot add more
    act(() => result.current.toggle("item-3"));
    expect(result.current.selectedCount).toBe(3);
    expect(result.current.isSelected("item-3")).toBe(false);
  });

  it("returns comma-separated serializedIds for form submission", () => {
    const { result } = renderHook(() => useBulkSelection(makeItems(5)));

    act(() => result.current.toggle("item-2"));
    act(() => result.current.toggle("item-4"));

    const ids = result.current.serializedIds.split(",");
    expect(ids).toHaveLength(2);
    expect(ids).toContain("item-2");
    expect(ids).toContain("item-4");
  });

  it("selectAll caps at maxSelection when given more IDs", () => {
    const items = makeItems(10);
    const { result } = renderHook(() => useBulkSelection(items, 3));

    act(() =>
      result.current.selectAll(["item-0", "item-1", "item-2", "item-3", "item-4"]),
    );
    expect(result.current.selectedCount).toBe(3);
    // Only the first 3 should be selected
    expect(result.current.isSelected("item-0")).toBe(true);
    expect(result.current.isSelected("item-1")).toBe(true);
    expect(result.current.isSelected("item-2")).toBe(true);
    expect(result.current.isSelected("item-3")).toBe(false);
  });
});
