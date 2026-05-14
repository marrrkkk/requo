import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getExistingPushSubscriptionMock,
  getPushPermissionMock,
  isPushConfiguredForClientMock,
  isPushSupportedMock,
  refreshMock,
  removePushSubscriptionMock,
  savePushSubscriptionMock,
  subscribeToPushMock,
  toastErrorMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  getExistingPushSubscriptionMock: vi.fn(),
  getPushPermissionMock: vi.fn(),
  isPushConfiguredForClientMock: vi.fn(),
  isPushSupportedMock: vi.fn(),
  refreshMock: vi.fn(),
  removePushSubscriptionMock: vi.fn(),
  savePushSubscriptionMock: vi.fn(),
  subscribeToPushMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: vi.fn(),
    forward: vi.fn(),
    push: vi.fn(),
    refresh: refreshMock,
    replace: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

vi.mock("@/features/notifications/push-client", () => ({
  getExistingPushSubscription: getExistingPushSubscriptionMock,
  getPushPermission: getPushPermissionMock,
  isPushConfiguredForClient: isPushConfiguredForClientMock,
  isPushSupported: isPushSupportedMock,
  removePushSubscription: removePushSubscriptionMock,
  savePushSubscription: savePushSubscriptionMock,
  subscribeToPush: subscribeToPushMock,
}));

import { BusinessNotificationSettingsForm } from "@/features/settings/components/business-notification-settings-form";

const pushSubscription = {
  endpoint: "https://push.example/subscription-1",
  toJSON: () => ({
    endpoint: "https://push.example/subscription-1",
    keys: {
      auth: "auth-secret",
      p256dh: "p256dh-key",
    },
  }),
} as unknown as PushSubscription;

const baseSettings = {
  notifyInAppOnNewInquiry: false,
  notifyInAppOnQuoteSent: false,
  notifyInAppOnQuoteResponse: false,
  notifyInAppOnMemberInviteResponse: false,
  notifyPushOnNewInquiry: false,
  notifyPushOnQuoteSent: false,
  notifyPushOnQuoteResponse: false,
  notifyPushOnMemberInviteResponse: false,
  notifyInAppOnFollowUpReminder: false,
  notifyInAppOnQuoteExpiring: false,
};

function renderForm(options?: { settings?: Partial<typeof baseSettings> }) {
  const submitted = {
    current: null as Record<string, FormDataEntryValue> | null,
  };
  const action = vi.fn(async (_state, formData: FormData) => {
    submitted.current = Object.fromEntries(formData.entries());
    return { success: "Notification settings saved." };
  });

  render(
    <BusinessNotificationSettingsForm
      action={action}
      businessId="biz_123"
      settings={{ ...baseSettings, ...options?.settings }}
    />,
  );

  return { action, submitted };
}

describe("BusinessNotificationSettingsForm", () => {
  beforeEach(() => {
    getExistingPushSubscriptionMock.mockReset();
    getPushPermissionMock.mockReset();
    isPushConfiguredForClientMock.mockReset();
    isPushSupportedMock.mockReset();
    refreshMock.mockReset();
    removePushSubscriptionMock.mockReset();
    savePushSubscriptionMock.mockReset();
    subscribeToPushMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();

    getExistingPushSubscriptionMock.mockResolvedValue(null);
    getPushPermissionMock.mockReturnValue("granted");
    isPushConfiguredForClientMock.mockReturnValue(true);
    isPushSupportedMock.mockReturnValue(true);
    removePushSubscriptionMock.mockResolvedValue(true);
    savePushSubscriptionMock.mockResolvedValue(true);
    subscribeToPushMock.mockResolvedValue(pushSubscription);
  });

  it("subscribes this browser before enabling a push channel", async () => {
    const user = userEvent.setup();
    const { action, submitted } = renderForm();

    await user.click(screen.getAllByRole("button", { name: "None" })[0]);
    await user.click(await screen.findByRole("switch", { name: "Push" }));

    await waitFor(() =>
      expect(subscribeToPushMock).toHaveBeenCalledTimes(1),
    );
    expect(savePushSubscriptionMock).toHaveBeenCalledWith(
      pushSubscription,
      "biz_123",
    );

    await user.click(screen.getByRole("button", { name: "Save notifications" }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(submitted.current?.notifyPushOnNewInquiry).toBe("on");
  });

  it("does not enable a push channel when browser registration fails", async () => {
    const user = userEvent.setup();
    renderForm();

    subscribeToPushMock.mockResolvedValue(null);

    await user.click(screen.getAllByRole("button", { name: "None" })[0]);
    await user.click(await screen.findByRole("switch", { name: "Push" }));

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith(
        "Notification permission was not granted.",
      ),
    );
    // With FloatingFormActions, the Save button is only rendered when there
    // are unsaved changes. A failed push registration leaves no changes,
    // so the button should not be in the DOM at all.
    expect(screen.queryByRole("button", { name: "Save notifications" })).toBeNull();
  });

  it("removes this browser when the last push channel is disabled", async () => {
    const user = userEvent.setup();

    getExistingPushSubscriptionMock.mockResolvedValue(pushSubscription);

    renderForm({
      settings: {
        notifyPushOnNewInquiry: true,
      },
    });

    await user.click(screen.getByRole("button", { name: "Push" }));
    await user.click(await screen.findByRole("switch", { name: "Push" }));
    await user.click(screen.getByRole("button", { name: "Save notifications" }));

    await waitFor(() =>
      expect(removePushSubscriptionMock).toHaveBeenCalledWith(
        pushSubscription.endpoint,
        "biz_123",
      ),
    );
  });
});
