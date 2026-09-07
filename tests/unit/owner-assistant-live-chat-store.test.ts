/**
 * Live Assistant conversation store.
 *
 * The store exists so the owner Assistant survives things the chat has no say
 * over: a remount from `router.refresh()` or a server action, and leaving the
 * route entirely for another dashboard page. These specs pin the behaviour that
 * makes that safe — same conversation object across resolves, a minted session
 * adopted in place rather than rebuilt, and a hard scope boundary per
 * user + business (ADR 004).
 *
 * The store is module-level state, so every spec imports a fresh copy.
 */

import type { UIMessage } from "ai";
import { describe, expect, it, vi } from "vitest";

import type { AssistantHistoryRow } from "@/features/owner-assistant/components/message-mapping";

type LiveChatStore = typeof import("@/features/owner-assistant/live-chat-store");

const OWNER = "user_owner";
const OTHER_OWNER = "user_staff";
const SLUG = "brightside-print-studio";
const OTHER_SLUG = "northside-signs";

async function freshStore(): Promise<LiveChatStore> {
  vi.resetModules();
  return import("@/features/owner-assistant/live-chat-store");
}

function historyRows(...contents: string[]): AssistantHistoryRow[] {
  return contents.map((content, index) => ({
    id: `row-${index + 1}`,
    role: index % 2 === 0 ? "user" : "assistant",
    content,
  }));
}

function userMessage(id: string, text: string): UIMessage {
  return { id, role: "user", parts: [{ type: "text", text }] };
}

function textOf(messages: readonly UIMessage[]): string[] {
  return messages.map((message) =>
    message.parts
      .flatMap((part) => (part.type === "text" ? [part.text] : []))
      .join(""),
  );
}

/** The reply frames `/api/ai/owner-assistant/chat` streams back. */
function uiStreamChunks(text: string): string[] {
  return [
    `data: {"type":"start","messageId":"msg-1"}\n\n`,
    `data: {"type":"text-start","id":"text-1"}\n\n`,
    `data: {"type":"text-delta","id":"text-1","delta":${JSON.stringify(text)}}\n\n`,
    `data: {"type":"text-end","id":"text-1"}\n\n`,
    `data: {"type":"finish"}\n\n`,
    `data: [DONE]\n\n`,
  ];
}

function streamResponse(chunks: string[], sessionId: string): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "X-Session-Id": sessionId,
      },
    },
  );
}

/** Swap the guarded global fetch for a stub, restoring it afterwards. */
async function withFetch<T>(
  stub: typeof globalThis.fetch,
  run: () => Promise<T>,
): Promise<T> {
  const previous = globalThis.fetch;
  globalThis.fetch = stub;
  try {
    return await run();
  } finally {
    globalThis.fetch = previous;
  }
}

describe("resolving the conversation to show", () => {
  it("reopens the last conversation when the sidebar link carries no session", async () => {
    const store = await freshStore();
    const opened = store.resolveLiveConversation({
      userId: OWNER,
      businessSlug: SLUG,
      sessionId: null,
      history: () => [],
    });
    opened.chat.messages = [userMessage("m1", "How many open inquiries?")];
    store.setConversationDraft(opened.key, "and how many quotes are");

    // Leaving for another page unmounts the surface; clicking Assistant mounts
    // it again with no `?session=` yet.
    const reopened = store.resolveLiveConversation({
      userId: OWNER,
      businessSlug: SLUG,
      sessionId: null,
      history: () => [],
    });

    expect(reopened).toBe(opened);
    expect(reopened.chat).toBe(opened.chat);
    expect(textOf(reopened.chat.messages)).toEqual([
      "How many open inquiries?",
    ]);
    expect(reopened.draft).toBe("and how many quotes are");
  });

  it("rebuilds a conversation from the server transcript on a cold mount", async () => {
    const store = await freshStore();

    const conversation = store.resolveLiveConversation({
      userId: OWNER,
      businessSlug: SLUG,
      sessionId: "oas_cold",
      history: () => historyRows("What did I quote Acme?", "PHP 12,500."),
    });

    expect(conversation.sessionId).toBe("oas_cold");
    expect(textOf(conversation.chat.messages)).toEqual([
      "What did I quote Acme?",
      "PHP 12,500.",
    ]);
    // Rehydrated turns are already in the history panel, so none of them are
    // announced again.
    expect(conversation.announced).toBe(2);
    expect(conversation.autoSent).toBe(false);
  });

  it("keeps the live conversation instead of the transcript snapshot", async () => {
    const store = await freshStore();
    const live = store.resolveLiveConversation({
      userId: OWNER,
      businessSlug: SLUG,
      sessionId: "oas_live",
      history: () => historyRows("first question"),
    });
    live.chat.messages = [
      ...live.chat.messages,
      userMessage("m2", "second question"),
    ];

    // A refresh re-renders the page and hands down a transcript that predates
    // the newest turn; the live chat outranks it.
    const afterRefresh = store.resolveLiveConversation({
      userId: OWNER,
      businessSlug: SLUG,
      sessionId: "oas_live",
      history: () => historyRows("first question"),
    });

    expect(afterRefresh).toBe(live);
    expect(textOf(afterRefresh.chat.messages)).toEqual([
      "first question",
      "second question",
    ]);
  });

  it("switches to the conversation the owner explicitly started", async () => {
    const store = await freshStore();
    const previous = store.resolveLiveConversation({
      userId: OWNER,
      businessSlug: SLUG,
      sessionId: null,
      history: () => [],
    });
    previous.chat.messages = [userMessage("m1", "older question")];

    const started = store.startNewConversation({
      userId: OWNER,
      businessSlug: SLUG,
    });

    expect(started).not.toBe(previous);
    expect(started.chat.messages).toEqual([]);
    expect(
      store.resolveLiveConversation({
        userId: OWNER,
        businessSlug: SLUG,
        sessionId: null,
        history: () => [],
      }),
    ).toBe(started);
  });

  it("reuses an untouched conversation for a `?q=` hand-off, never a used one", async () => {
    const store = await freshStore();
    const empty = store.resolveLiveConversation({
      userId: OWNER,
      businessSlug: SLUG,
      sessionId: null,
      history: () => [],
    });

    // React renders twice in development; a hand-off must not stack up chats.
    expect(
      store.resolveLiveConversation({
        userId: OWNER,
        businessSlug: SLUG,
        sessionId: null,
        preferNew: true,
        history: () => [],
      }),
    ).toBe(empty);

    empty.chat.messages = [userMessage("m1", "an earlier question")];
    const handOff = store.resolveLiveConversation({
      userId: OWNER,
      businessSlug: SLUG,
      sessionId: null,
      preferNew: true,
      history: () => [],
    });

    expect(handOff).not.toBe(empty);
    expect(handOff.chat.messages).toEqual([]);
  });
});

describe("session minting", () => {
  it("adopts the session the server mints without restarting the chat", async () => {
    const store = await freshStore();
    const conversation = store.resolveLiveConversation({
      userId: OWNER,
      businessSlug: SLUG,
      sessionId: null,
      history: () => [],
    });
    const fetchStub = vi.fn(
      async () =>
        streamResponse(
          uiStreamChunks("You have 3 open inquiries."),
          "oas_minted",
        ),
    ) as unknown as typeof globalThis.fetch;

    await withFetch(fetchStub, () =>
      conversation.chat.sendMessage({ text: "How many open inquiries?" }),
    );

    expect(conversation.sessionId).toBe("oas_minted");
    expect(textOf(conversation.chat.messages)).toEqual([
      "How many open inquiries?",
      "You have 3 open inquiries.",
    ]);

    // The surface rewrites the URL to `?session=oas_minted` and re-resolves. It
    // has to land on the same chat, or the reply it just streamed disappears.
    const afterMint = store.resolveLiveConversation({
      userId: OWNER,
      businessSlug: SLUG,
      sessionId: "oas_minted",
      history: () => historyRows("a stale snapshot"),
    });

    expect(afterMint).toBe(conversation);
    expect(textOf(afterMint.chat.messages)).toEqual([
      "How many open inquiries?",
      "You have 3 open inquiries.",
    ]);
  });

  it("records the plan-limit notice from a 429 on the conversation", async () => {
    const store = await freshStore();
    const conversation = store.resolveLiveConversation({
      userId: OWNER,
      businessSlug: SLUG,
      sessionId: null,
      history: () => [],
    });
    const fetchStub = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: "You've used all 50 Assistant messages this month.",
            upgradeRequired: true,
          }),
          { status: 429, headers: { "Content-Type": "application/json" } },
        ),
    ) as unknown as typeof globalThis.fetch;

    await withFetch(fetchStub, async () => {
      await conversation.chat.sendMessage({ text: "one more question" });
    });

    await vi.waitFor(() =>
      expect(conversation.limitMessage).toBe(
        "You've used all 50 Assistant messages this month.",
      ),
    );
  });
});

describe("transcript privacy (ADR 004)", () => {
  it("never hands one member's conversation to another in the same tab", async () => {
    const store = await freshStore();
    const mine = store.resolveLiveConversation({
      userId: OWNER,
      businessSlug: SLUG,
      sessionId: "oas_private",
      history: () => historyRows("my revenue this month?"),
    });

    const theirs = store.resolveLiveConversation({
      userId: OTHER_OWNER,
      businessSlug: SLUG,
      sessionId: null,
      history: () => [],
    });
    // Even holding the id, a second sign-in gets a chat of its own.
    const theirsBySession = store.resolveLiveConversation({
      userId: OTHER_OWNER,
      businessSlug: SLUG,
      sessionId: "oas_private",
      history: () => [],
    });

    expect(theirs).not.toBe(mine);
    expect(theirsBySession).not.toBe(mine);
    expect(theirs.chat.messages).toEqual([]);
    expect(theirsBySession.chat.messages).toEqual([]);
  });

  it("keeps conversations separate per business", async () => {
    const store = await freshStore();
    const here = store.resolveLiveConversation({
      userId: OWNER,
      businessSlug: SLUG,
      sessionId: null,
      history: () => [],
    });
    here.chat.messages = [userMessage("m1", "this business only")];

    const there = store.resolveLiveConversation({
      userId: OWNER,
      businessSlug: OTHER_SLUG,
      sessionId: null,
      history: () => [],
    });

    expect(there).not.toBe(here);
    expect(there.chat.messages).toEqual([]);
  });
});

describe("deleting a session", () => {
  it("forgets the live copy so it cannot come back as the last chat", async () => {
    const store = await freshStore();
    const deleted = store.resolveLiveConversation({
      userId: OWNER,
      businessSlug: SLUG,
      sessionId: "oas_deleted",
      history: () => historyRows("question in the deleted chat"),
    });
    const versionBefore = store.getLiveChatVersion();
    const notified = vi.fn();
    const unsubscribe = store.subscribeToLiveChat(notified);

    // The history panel deletes by session id and knows nothing about the user.
    store.forgetLiveConversation({ businessSlug: SLUG, sessionId: "oas_deleted" });

    expect(notified).toHaveBeenCalled();
    expect(store.getLiveChatVersion()).toBeGreaterThan(versionBefore);
    expect(store.getLiveConversation(deleted.key)).toBeNull();
    unsubscribe();

    const afterDelete = store.resolveLiveConversation({
      userId: OWNER,
      businessSlug: SLUG,
      sessionId: null,
      history: () => [],
    });

    expect(afterDelete).not.toBe(deleted);
    expect(afterDelete.chat.messages).toEqual([]);
  });

  it("leaves other conversations in the same business alone", async () => {
    const store = await freshStore();
    const kept = store.resolveLiveConversation({
      userId: OWNER,
      businessSlug: SLUG,
      sessionId: "oas_kept",
      history: () => historyRows("still here"),
    });
    store.resolveLiveConversation({
      userId: OWNER,
      businessSlug: SLUG,
      sessionId: "oas_gone",
      history: () => historyRows("on its way out"),
    });

    store.forgetLiveConversation({ businessSlug: SLUG, sessionId: "oas_gone" });

    expect(
      store.resolveLiveConversation({
        userId: OWNER,
        businessSlug: SLUG,
        sessionId: "oas_kept",
        history: () => historyRows("still here"),
      }),
    ).toBe(kept);
  });
});

describe("cache cap", () => {
  it("drops the coldest conversation and keeps the warm ones", async () => {
    const store = await freshStore();
    // Real clock ties would make "coldest" ambiguous.
    const now = vi.spyOn(Date, "now");
    let tick = 1_000;
    now.mockImplementation(() => (tick += 1_000));

    try {
      const conversations = Array.from({ length: 6 }, (_, index) =>
        store.resolveLiveConversation({
          userId: OWNER,
          businessSlug: SLUG,
          sessionId: `oas_${index + 1}`,
          history: () => historyRows(`question ${index + 1}`),
        }),
      );

      // The cap is five, so only the oldest idle conversation is let go.
      expect(
        store.resolveLiveConversation({
          userId: OWNER,
          businessSlug: SLUG,
          sessionId: "oas_2",
          history: () => historyRows("question 2"),
        }),
      ).toBe(conversations[1]);
      expect(
        store.resolveLiveConversation({
          userId: OWNER,
          businessSlug: SLUG,
          sessionId: "oas_1",
          history: () => historyRows("question 1"),
        }),
      ).not.toBe(conversations[0]);
    } finally {
      now.mockRestore();
    }
  });

  it("never evicts a conversation that is still streaming", async () => {
    const store = await freshStore();
    const streaming = store.resolveLiveConversation({
      userId: OWNER,
      businessSlug: SLUG,
      sessionId: null,
      history: () => [],
    });
    const chunks = uiStreamChunks("A long answer, still arriving.");
    const encoder = new TextEncoder();
    let finish: (() => void) | null = null;
    const fetchStub = vi.fn(
      async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              // Enough frames to reach `streaming`, then hold the stream open.
              for (const chunk of chunks.slice(0, 3)) {
                controller.enqueue(encoder.encode(chunk));
              }
              finish = () => {
                for (const chunk of chunks.slice(3)) {
                  controller.enqueue(encoder.encode(chunk));
                }
                controller.close();
              };
            },
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "text/event-stream",
              "X-Session-Id": "oas_streaming",
            },
          },
        ),
    ) as unknown as typeof globalThis.fetch;

    await withFetch(fetchStub, async () => {
      const pending = streaming.chat.sendMessage({ text: "explain at length" });
      await vi.waitFor(() => {
        expect(streaming.sessionId).toBe("oas_streaming");
        expect(streaming.chat.status).toBe("streaming");
      });

      // Six more conversations push the cache past its cap while this one is
      // mid-stream; losing it would abandon the reply the owner is watching.
      for (let index = 1; index <= 6; index += 1) {
        store.resolveLiveConversation({
          userId: OWNER,
          businessSlug: SLUG,
          sessionId: `oas_other_${index}`,
          history: () => historyRows(`other question ${index}`),
        });
      }

      expect(
        store.resolveLiveConversation({
          userId: OWNER,
          businessSlug: SLUG,
          sessionId: "oas_streaming",
          history: () => [],
        }),
      ).toBe(streaming);

      finish?.();
      await pending;
    });

    expect(streaming.chat.status).toBe("ready");
  });
});
