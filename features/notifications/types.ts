export const businessNotificationTypes = [
  "public_inquiry_submitted",
  "quote_customer_accepted",
  "quote_customer_rejected",
  "business_member_invite_accepted",
  "business_member_invite_declined",
] as const;

export type BusinessNotificationType =
  (typeof businessNotificationTypes)[number];

export type BusinessNotificationRecord = {
  id: string;
  businessId: string;
  inquiryId: string | null;
  quoteId: string | null;
  type: BusinessNotificationType;
  title: string;
  summary: string;
  createdAt: Date;
};

export type BusinessNotificationItem = {
  id: string;
  type: BusinessNotificationType;
  title: string;
  summary: string;
  href: string;
  createdAt: string;
  unread: boolean;
};

export type BusinessNotificationBellView = {
  items: BusinessNotificationItem[];
  unreadCount: number;
  lastReadAt: string | null;
};

export type BusinessNotificationActionResult =
  | {
      ok: true;
      lastReadAt: string;
    }
  | {
      ok: false;
      error: string;
    };
