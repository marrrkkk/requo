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
import type { BusinessPlan } from "@/lib/plans/plans";
import { businessMemberRoles } from "@/lib/business-members";
import { user } from "@/lib/db/schema/auth";

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
  companySize: text("company_size"),
  referralSource: text("referral_source"),
  avatarStoragePath: text("avatar_storage_path"),
  avatarContentType: text("avatar_content_type"),
  onboardingCompletedAt: timestamp("onboarding_completed_at", {
    withTimezone: true,
  }),
  dashboardTourCompletedAt: timestamp("dashboard_tour_completed_at", {
    withTimezone: true,
  }),
  formEditorTourCompletedAt: timestamp("form_editor_tour_completed_at", {
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
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    plan: text("plan")
      .$type<BusinessPlan>()
      .notNull()
      .default("free"),
    businessType: text("business_type")
      .$type<BusinessType>()
      .notNull()
      .default("general_project_services"),
    countryCode: text("country_code"),
    shortDescription: text("short_description"),
    /** How inbound customers typically reach this business (onboarding insight). */
    customerContactChannel: text("customer_contact_channel"),
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
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by").references(() => user.id, {
      onDelete: "set null",
    }),
    lockedReason: text("locked_reason"),
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
    index("businesses_owner_user_id_idx").on(table.ownerUserId),
    index("businesses_owner_deleted_at_idx").on(
      table.ownerUserId,
      table.deletedAt,
    ),
    index("businesses_owner_archived_at_idx").on(
      table.ownerUserId,
      table.archivedAt,
    ),
    index("businesses_owner_locked_at_idx").on(
      table.ownerUserId,
      table.lockedAt,
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
    check(
      "businesses_plan_valid",
      sql`${table.plan} in ('free', 'pro', 'business')`,
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

export const userRecentBusinesses = pgTable(
  "user_recent_businesses",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    lastOpenedAt: timestamp("last_opened_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("user_recent_businesses_user_business_unique").on(
      table.userId,
      table.businessId,
    ),
    index("user_recent_businesses_user_recent_idx").on(
      table.userId,
      table.lastOpenedAt,
    ),
    index("user_recent_businesses_business_id_idx").on(table.businessId),
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
