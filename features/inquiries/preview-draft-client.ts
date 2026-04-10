"use client";

import {
  getInquiryPreviewDraftChannelName,
  getInquiryPreviewDraftStorageKey,
  type InquiryPreviewDraftPayload,
  type InquiryPreviewDraftSnapshot,
} from "@/features/inquiries/preview-draft";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseInquiryPreviewDraftPayload(
  value: unknown,
): InquiryPreviewDraftPayload | null {
  if (!isRecord(value)) {
    return null;
  }

  const { snapshot, updatedAt } = value;

  if (!isRecord(snapshot) || typeof updatedAt !== "number") {
    return null;
  }

  return {
    snapshot: snapshot as InquiryPreviewDraftSnapshot,
    updatedAt,
  };
}

function parseStoredDraft(value: string | null): InquiryPreviewDraftPayload | null {
  if (!value) {
    return null;
  }

  try {
    return parseInquiryPreviewDraftPayload(JSON.parse(value));
  } catch {
    return null;
  }
}

export function readInquiryPreviewDraft(sessionId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return parseStoredDraft(
    window.localStorage.getItem(getInquiryPreviewDraftStorageKey(sessionId)),
  );
}

export function writeInquiryPreviewDraft(
  sessionId: string,
  snapshot: InquiryPreviewDraftSnapshot,
) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: InquiryPreviewDraftPayload = {
    snapshot,
    updatedAt: Date.now(),
  };
  const serializedPayload = JSON.stringify(payload);

  window.localStorage.setItem(
    getInquiryPreviewDraftStorageKey(sessionId),
    serializedPayload,
  );

  if (typeof BroadcastChannel === "undefined") {
    return;
  }

  const channel = new BroadcastChannel(
    getInquiryPreviewDraftChannelName(sessionId),
  );
  channel.postMessage(payload);
  channel.close();
}

export function subscribeToInquiryPreviewDraft(
  sessionId: string,
  onChange: (payload: InquiryPreviewDraftPayload) => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const storageKey = getInquiryPreviewDraftStorageKey(sessionId);
  const channelName = getInquiryPreviewDraftChannelName(sessionId);
  const channel =
    typeof BroadcastChannel === "undefined"
      ? null
      : new BroadcastChannel(channelName);

  function handlePayload(value: unknown) {
    const payload = parseInquiryPreviewDraftPayload(value);

    if (!payload) {
      return;
    }

    onChange(payload);
  }

  function handleStorage(event: StorageEvent) {
    if (event.key !== storageKey) {
      return;
    }

    const payload = parseStoredDraft(event.newValue);

    if (!payload) {
      return;
    }

    onChange(payload);
  }

  function handleMessage(event: MessageEvent) {
    handlePayload(event.data);
  }

  channel?.addEventListener("message", handleMessage);
  window.addEventListener("storage", handleStorage);

  return () => {
    channel?.removeEventListener("message", handleMessage);
    channel?.close();
    window.removeEventListener("storage", handleStorage);
  };
}
