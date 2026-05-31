"use client";

import { useCallback, useState } from "react";

const MAX_HISTORY = 20;

export type UseUndoRedoOptions<T> = {
  /** The initial state snapshot to seed the history stack. */
  initialState: T;
};

export type UseUndoRedoReturn<T> = {
  /** Push a new state snapshot onto the history stack. */
  pushState: (state: T) => void;
  /** Undo to the previous state. Returns the restored state or null if nothing to undo. */
  undo: () => T | null;
  /** Redo to the next state. Returns the restored state or null if nothing to redo. */
  redo: () => T | null;
  /** Whether an undo operation is available. */
  canUndo: boolean;
  /** Whether a redo operation is available. */
  canRedo: boolean;
  /** Reset the history stack with a new initial state. */
  reset: (state: T) => void;
};

type HistoryState<T> = {
  past: T[];
  current: T;
  future: T[];
};

/**
 * A generic undo/redo hook that maintains a 20-step history stack.
 * Works with any serializable state type — designed for workflow builder state.
 */
export function useUndoRedo<T>({
  initialState,
}: UseUndoRedoOptions<T>): UseUndoRedoReturn<T> {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    current: initialState,
    future: [],
  });

  const pushState = useCallback((state: T) => {
    setHistory((h) => ({
      past: [...h.past, h.current].slice(-MAX_HISTORY),
      current: state,
      future: [],
    }));
  }, []);

  const undo = useCallback((): T | null => {
    let restored: T | null = null;
    setHistory((h) => {
      if (h.past.length === 0) return h;
      const previous = h.past[h.past.length - 1];
      restored = previous;
      return {
        past: h.past.slice(0, -1),
        current: previous,
        future: [h.current, ...h.future].slice(0, MAX_HISTORY),
      };
    });
    return restored;
  }, []);

  const redo = useCallback((): T | null => {
    let restored: T | null = null;
    setHistory((h) => {
      if (h.future.length === 0) return h;
      const next = h.future[0];
      restored = next;
      return {
        past: [...h.past, h.current].slice(-MAX_HISTORY),
        current: next,
        future: h.future.slice(1),
      };
    });
    return restored;
  }, []);

  const reset = useCallback((state: T) => {
    setHistory({ past: [], current: state, future: [] });
  }, []);

  return {
    pushState,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    reset,
  };
}
