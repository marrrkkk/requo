import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

const refreshMock = vi.fn();

vi.mock("@/hooks/use-progress-router", () => ({
  useProgressRouter: () => ({
    refresh: refreshMock,
  }),
}));

import { useDeferredRefresh } from "@/hooks/use-deferred-refresh";

describe("useDeferredRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    refreshMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces refresh calls within the default window", () => {
    const { result } = renderHook(() => useDeferredRefresh());

    act(() => {
      result.current.scheduleRefresh();
      result.current.scheduleRefresh();
    });

    expect(refreshMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("refreshes immediately when refreshNow is called", () => {
    const { result } = renderHook(() => useDeferredRefresh());

    act(() => {
      result.current.scheduleRefresh();
      result.current.refreshNow();
    });

    expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});
