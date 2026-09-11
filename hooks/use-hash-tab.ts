"use client";

import { useCallback, useSyncExternalStore } from "react";

function subscribeToHashChange(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
  };
}

/**
 * Hash-synced tab selection for settings tab shells (Quote, Assistant).
 *
 * The hash is the tab id (`#templates`, `#knowledge`, …). The URL is the
 * single source of truth via `useSyncExternalStore`: the server snapshot is
 * the default key, the client snapshot reads `window.location.hash` (unknown
 * hashes fall back to the default). Back/forward, pasted links, and
 * command-menu pushes arrive through the native `hashchange` event.
 * Selection writes use `history.replaceState` (no scroll jump, no history
 * spam) followed by a synthetic `hashchange` so subscribers re-read.
 */
export function useHashTab<TKey extends string>(
  validKeys: ReadonlyArray<TKey>,
  defaultKey: TKey,
) {
  const getSnapshot = useCallback(() => {
    const hash = window.location.hash.slice(1);
    return (validKeys as ReadonlyArray<string>).includes(hash)
      ? (hash as TKey)
      : defaultKey;
  }, [validKeys, defaultKey]);

  const getServerSnapshot = useCallback(() => defaultKey, [defaultKey]);

  const selected = useSyncExternalStore(
    subscribeToHashChange,
    getSnapshot,
    getServerSnapshot,
  );

  const handleSelectionChange = useCallback((key: TKey) => {
    window.history.replaceState(null, "", `#${key}`);
    window.dispatchEvent(new Event("hashchange"));
  }, []);

  return { selected, handleSelectionChange };
}
