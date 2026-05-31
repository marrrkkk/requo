import type { PublicInquiryChatExtractedFields } from "@/features/inquiries/public-inquiry-chat-schemas";
import type { PublicInquiryBusiness } from "@/features/inquiries/types";
import type { ChatMessage, ConversationPhase } from "./types";

export type CachedChatState = {
  messages: ChatMessage[];
  phase: ConversationPhase;
  extractedFields: PublicInquiryChatExtractedFields | null;
  editedFields: PublicInquiryChatExtractedFields | null;
  savedAt: number;
};

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getCacheKey(business: PublicInquiryBusiness) {
  return `requo:inquiry-chat:v2:${business.slug}:${business.form.slug}`;
}

export function loadCachedChat(business: PublicInquiryBusiness): CachedChatState | null {
  try {
    const raw = localStorage.getItem(getCacheKey(business));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedChatState;

    // Expire stale caches
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) {
      localStorage.removeItem(getCacheKey(business));
      return null;
    }

    // Don't restore if no messages or if already submitted
    if (!parsed.messages?.length || parsed.phase === "submitting") return null;

    return parsed;
  } catch {
    return null;
  }
}

export function saveChatToCache(
  business: PublicInquiryBusiness,
  state: Omit<CachedChatState, "savedAt">,
) {
  try {
    const payload: CachedChatState = { ...state, savedAt: Date.now() };
    localStorage.setItem(getCacheKey(business), JSON.stringify(payload));
  } catch {
    // Silently ignore storage errors (quota, private browsing, etc.)
  }
}

export function clearChatCache(business: PublicInquiryBusiness) {
  try {
    localStorage.removeItem(getCacheKey(business));
  } catch {
    // Silently ignore
  }
}
