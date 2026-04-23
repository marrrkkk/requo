import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import type { BusinessType } from "@/features/inquiries/business-types";
import type { InquiryFormConfig } from "@/features/inquiries/form-config";
import type { InquiryPageConfig } from "@/features/inquiries/page-config";
import type { QuoteEmailTemplateConfig } from "@/features/settings/email-templates";
import { businessMemberRoles } from "@/lib/business-members";
import { user } from "@/lib/db/schema/auth";
import { workspaces } from "@/lib/db/schema/workspaces";

export const businessMemberRoleEnum = pgEnum("business_member_role", [
  ...businessMemberRoles,
]);

export const businessAiTonePreferenceEnum = pgEnum(
  "business_ai_tone_preference",
  ["balanced", "warm", "direct", "formal"],
);

export const profileThemePreferenceEnum = pgEnum("profile_theme_preference", [
  "light",
  "dark",
  "system",
]);

export const profiles = pgTable("profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  jobTitle: text("job_title"),
  referralSource: text("referral_source"),
  avatarStoragePath: text("avatar_storage_path"),
  avatarContentType: text("avatar_content_type"),
  onboardingCompletedAt: timestamp("onboarding_completed_at", {
    withTimezone: true,
  }),
  themePreference: profileThemePreferenceEnum("theme_preference")
    .notNull()
    .default("system"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const businesses = pgTable(
  "businesses",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    businessType: text("business_type")
      .$type<BusinessType>()
      .notNull()
      .default("general_project_services"),
    countryCode: text("country_code"),
    shortDescription: text("short_description"),
    contactEmail: text("contact_email"),
    logoStoragePath: text("logo_storage_path"),
    logoContentType: text("logo_content_type"),
    publicInquiryEnabled: boolean("public_inquiry_enabled")
      .notNull()
      .default(true),
    inquiryHeadline: text("inquiry_headline"),
    inquiryFormConfig: jsonb("inquiry_form_config").$type<InquiryFormConfig>(),
    inquiryPageConfig: jsonb("inquiry_page_config").$type<InquiryPageConfig>(),
    defaultEmailSignature: text("default_email_signature"),
    defaultQuoteNotes: text("default_quote_notes"),
    quoteEmailTemplate:
      jsonb("quote_email_template").$type<QuoteEmailTemplateConfig>(),
    defaultQuoteValidityDays: integer("default_quote_validity_days")
      .notNull()
      .default(14),
    aiTonePreference: businessAiTonePreferenceEnum("ai_tone_preference")
      .notNull()
      .default("balanced"),
    notifyOnNewInquiry: boolean("notify_on_new_inquiry")
      .notNull()
      .default(true),
    notifyOnQuoteSent: boolean("notify_on_quote_sent").notNull().default(true),
    notifyOnQuoteResponse: boolean("notify_on_quote_response")
      .notNull()
      .default(true),
    notifyInAppOnNewInquiry: boolean("notify_in_app_on_new_inquiry")
      .notNull()
      .default(true),
    notifyInAppOnQuoteSent: boolean("notify_in_app_on_quote_sent")
      .notNull()
      .default(true),
    notifyInAppOnQuoteResponse: boolean("notify_in_app_on_quote_response")
      .notNull()
      .default(true),
    notifyOnMemberInviteResponse: boolean("notify_on_member_invite_response")
      .notNull()
      .default(true),
    notifyInAppOnMemberInviteResponse: boolean("notify_in_app_on_member_invite_response")
      .notNull()
      .default(true),
    notifyPushOnNewInquiry: boolean("notify_push_on_new_inquiry")
      .notNull()
      .default(false),
    notifyPushOnQuoteSent: boolean("notify_push_on_quote_sent")
      .notNull()
      .default(false),
    notifyPushOnQuoteResponse: boolean("notify_push_on_quote_response")
      .notNull()
      .default(false),
    notifyPushOnMemberInviteResponse: boolean("notify_push_on_member_invite_response")
      .notNull()
      .default(false),
    notifyOnFollowUpReminder: boolean("notify_on_follow_up_reminder")
      .notNull()
      .default(true),
    notifyInAppOnFollowUpReminder: boolean("notify_in_app_on_follow_up_reminder")
      .notNull()
      .default(true),
    notifyOnQuoteExpiring: boolean("notify_on_quote_expiring")
      .notNull()
      .default(true),
    notifyInAppOnQuoteExpiring: boolean("notify_in_app_on_quote_expiring")
      .notNull()
      .default(true),
    defaultCurrency: text("default_currency").notNull().default("USD"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    archivedBy: text("archived_by").references(() => user.id, {
      onDelete: "set null",
    }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("businesses_slug_unique").on(table.slug),
    index("businesses_created_at_idx").on(table.createdAt),
    index("businesses_workspace_id_idx").on(table.workspaceId),
    index("businesses_workspace_archived_at_idx").on(
      table.workspaceId,
      table.archivedAt,
    ),
    index("businesses_workspace_deleted_at_idx").on(
      table.workspaceId,
      table.deletedAt,
    ),
    check("businesses_slug_format", sql`${table.slug} ~ '^[a-z0-9-]+$'`),
    check(
      "businesses_country_code_format",
      sql`${table.countryCode} is null or ${table.countryCode} ~ '^[A-Z]{2}$'`,
    ),
    check(
      "businesses_default_quote_validity_days_range",
      sql`${table.defaultQuoteValidityDays} between 1 and 365`,
    ),
  ],
);

export const businessMembers = pgTable(
  "business_members",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: businessMemberRoleEnum("role").notNull().default("staff"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("business_members_business_user_unique").on(
      table.businessId,
      table.userId,
    ),
    index("business_members_user_id_idx").on(table.userId),
    index("business_members_business_role_idx").on(table.businessId, table.role),
  ],
);

export const businessMemberInvites = pgTable(
  "business_member_invites",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    inviterUserId: text("inviter_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: businessMemberRoleEnum("role").notNull().default("staff"),
    token: text("token"),
    tokenHash: text("token_hash"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("business_member_invites_token_unique").on(table.token),
    uniqueIndex("business_member_invites_token_hash_unique").on(table.tokenHash),
    uniqueIndex("business_member_invites_business_email_unique").on(
      table.businessId,
      table.email,
    ),
    index("business_member_invites_business_id_idx").on(table.businessId),
    index("business_member_invites_email_idx").on(table.email),
    index("business_member_invites_token_hash_idx").on(table.tokenHash),
    index("business_member_invites_expires_at_idx").on(table.expiresAt),
  ],
);
