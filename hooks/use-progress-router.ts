"use client";

import { useRouter } from "next/navigation";

/**
 * Previously wrapped useRouter to dispatch progress bar events.
 * Now that the global progress bar is removed, this simply re-exports useRouter
 * for backward compatibility with existing consumers.
 */
export function useProgressRouter() {
  return useRouter();
}
