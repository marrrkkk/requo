import "server-only";

// ---------------------------------------------------------------------------
// Legacy OpenRouter client — DEPRECATED
//
// The AI layer now uses @openrouter/ai-sdk-provider via Vercel AI SDK.
// This file is retained only to avoid breaking imports during transition.
// It will be removed in a future cleanup pass.
// ---------------------------------------------------------------------------

import { isOpenRouterConfigured } from "@/lib/env";

/** @deprecated Use the Vercel AI SDK OpenRouter provider instead. */
export function getOpenRouterClient(): null {
  void isOpenRouterConfigured;
  return null;
}
