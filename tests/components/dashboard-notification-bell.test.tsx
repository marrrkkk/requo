import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, beforeEach, expect, it, vi } from "vitest";

import { DashboardNotificationBell } from "@/features/notifications/components/dashboard-notification-bell";

const {
  channelMock,
  fetchMock,
  loadMoreBusinessNotificationsActionMock,
  markBusinessNotificationsReadActionMock,
  pushMock,
  refreshMock,
  removeChannelMock,
  setAuthMock,
  useIsMobileMock,
} = vi.hoisted(() => ({
  channelMock: vi.fn(),
  fetchMock: vi.fn(),
  loadMoreBusinessNotificationsActionMock: vi.fn(),
  markBusinessNotificationsReadActionMock: vi.fn(),
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  removeChannelMock: vi.fn(),
  setAuthMock: vi.fn(),
  useIsMobileMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

vi.mock("@/lib/supabase/browser", () => ({
  createSupabaseBrowserClient: () => ({
    realtime: {
      setAuth: setAuthMock,
    },
    channel: channelMock,
    removeChannel: removeChannelMock,
  }),
}));

vi.mock("@/features/notifications/actions", () => ({
  loadMoreBusinessNotificationsAction: loadMoreBusinessNotificationsActionMock,
  markBusinessNotificationsReadAction: markBusinessNotificationsReadActionMock,
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: useIsMobileMock,
}));

type NotificationInsertHandler = (payload: {
  new: {
    created_at: string;
    id: string;
    inquiry_id: string | null;
    quote_id: string | null;
    summary: string;
    title: string;
    type: "public_inquiry_submitted";
  };
}) => void;

type InquiryInsertHandler = (payload: {
  new: {
    id: string;
  };
}) => void;

let notificationInsertHandler: NotificationInsertHandler | null = null;
let inquiryInsertHandler: InquiryInsertHandler | null = null;

describe("DashboardNotificationBell", () => {
  beforeEach(() => {
    notificationInsertHandler = null;
    inquiryInsertHandler = null;
    pushMock.mockReset();
    refreshMock.mockReset();
    removeChannelMock.mockReset();
    setAuthMock.mockReset();
    useIsMobileMock.mockReset();
    useIsMobileMock.mockReturnValue(false);
    loadMoreBusinessNotificationsActionMock.mockReset();
    markBusinessNotificationsReadActionMock.mockReset();

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        token: "test-realtime-token",
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    channelMock.mockImplementation(() => {
      const channel = {
        on: vi.fn((_event, filter, handler) => {
          if (
            filter?.table === "business_notifications" &&
            filter?.event === "INSERT"
          ) {
            notificationInsertHandler = handler as NotificationInsertHandler;
          }

          if (filter?.table === "inquiries" && filter?.event === "INSERT") {
            inquiryInsertHandler = handler as InquiryInsertHandler;
          }

          return channel;
        }),
        subscribe: vi.fn(() => channel),
      };

      return channel;
    });
  });

  it("subscribes on mount and refreshes the route when a notification arrives", async () => {
    render(
      <DashboardNotificationBell
        businessId="biz_123"
        businessSlug="acme"
        initialView={{
          items: [],
          unreadCount: 0,
          lastReadAt: null,
          hasMore: false,
        }}
        userId="user_123"
      />,
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/business/notifications/realtime-token",
        { cache: "no-store" },
      ),
    );
    await waitFor(() => expect(setAuthMock).toHaveBeenCalledWith("test-realtime-token"));
    await waitFor(() => expect(notificationInsertHandler).not.toBeNull());
    await waitFor(() => expect(inquiryInsertHandler).not.toBeNull());

    await act(async () => {
      notificationInsertHandler?.({
        new: {
          id: "ntf_123",
          inquiry_id: "inq_123",
          quote_id: null,
          summary: "Storefront refresh via Website form",
          title: "New inquiry from New Customer",
          type: "public_inquiry_submitted",
          created_at: new Date().toISOString(),
        },
      });

      await new Promise((resolve) => window.setTimeout(resolve, 150));
    });

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "1 unread notifications" }),
      ).toBeInTheDocument(),
    );
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("refreshes route when an inquiry insert arrives", async () => {
    render(
      <DashboardNotificationBell
        businessId="biz_123"
        businessSlug="acme"
        initialView={{
          items: [],
          unreadCount: 0,
          lastReadAt: null,
          hasMore: false,
        }}
        userId="user_123"
      />,
    );

    await waitFor(() => expect(inquiryInsertHandler).not.toBeNull());

    await act(async () => {
      inquiryInsertHandler?.({
        new: {
          id: "inq_123",
        },
      });

      await new Promise((resolve) => window.setTimeout(resolve, 150));
    });

    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("opens notifications in a mobile sheet", async () => {
    useIsMobileMock.mockReturnValue(true);
    const user = userEvent.setup();

    render(
      <DashboardNotificationBell
        businessId="biz_123"
        businessSlug="acme"
        initialView={{
          items: [
            {
              id: "ntf_123",
              type: "quote_customer_accepted",
              title: "Quote accepted by a customer with a long name",
              summary:
                "The customer accepted the quote and left enough detail to wrap cleanly on a phone.",
              href: "/businesses/acme/quotes/quote_123",
              createdAt: new Date().toISOString(),
              unread: true,
            },
          ],
          unreadCount: 1,
          lastReadAt: null,
          hasMore: false,
        }}
        userId="user_123"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "1 unread notifications" }),
    );

    expect(
      await screen.findByRole("dialog", { name: "Notifications" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Quote accepted by a customer with a long name"),
    ).toBeInTheDocument();
  });
});
