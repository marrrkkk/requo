/**
 * scripts/seed-demo.ts
 *
 * Comprehensive demo database seeder for Requo.
 *
 * Creates fully linked data chains:
 *   Inquiry → Quote → Job → Invoice
 *
 * Run: npm run db:seed-demo
 * Requires: DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, and other
 * required app env vars used by lib/env.ts.
 *
 * Dev only. This truncates app data before seeding.
 */
import "dotenv/config";

process.env.DISABLE_TRANSACTIONAL_EMAILS ??= "1";

import { createHmac } from "node:crypto";

import { eq, sql } from "drizzle-orm";

import type { BusinessType } from "../features/inquiries/business-types";
import type { InquirySubmittedFieldSnapshot } from "../features/inquiries/form-config";
import { createInquiryFormPreset } from "../features/inquiries/inquiry-forms";
import { db, dbConnection } from "../lib/db/client";
import {
  accountSubscriptions,
  activityLogs,
  aiConversations,
  aiDrafts,
  aiMessages,
  aiTokenLogs,
  aiUsageEvents,
  analyticsEvents,
  auditLogs,
  billingEvents,
  businessInquiryForms,
  businessMemberInvites,
  businessMembers,
  businessMemories,
  businessNotificationReads,
  businessNotifications,
  businessNotificationStates,
  businesses,
  businessSubscriptions,
  emailAttempts,
  emailOutbox,
  followUps,
  inquiries,
  inquiryMessages,
  inquiryNotes,
  invoiceItems,
  invoices,
  jobItems,
  jobs,
  paymentAttempts,
  postWinChecklistItems,
  profiles,
  quoteItems,
  quoteLibraryEntries,
  quoteLibraryEntryItems,
  quotes,
  replySnippets,
  user,
  userRecentBusinesses,
} from "../lib/db/schema";
import { env } from "../lib/env";
import type { BusinessPlan } from "../lib/plans/plans";
import type { InquiryStatus } from "../lib/db/schema/inquiries";
import type { QuoteStatus, QuotePostAcceptanceStatus } from "../lib/db/schema/quotes";
import type { JobStatus } from "../lib/db/schema/jobs";
import type { InvoiceStatus } from "../lib/db/schema/invoices";

const DEFAULT_PASSWORD = "ChangeMe123456!";

const ownerEmail = env.DEMO_OWNER_EMAIL ?? "demo@requo.local";
const ownerPassword = env.DEMO_OWNER_PASSWORD ?? DEFAULT_PASSWORD;
const managerEmail = process.env.DEMO_MANAGER_EMAIL ?? "manager@requo.local";
const managerPassword = process.env.DEMO_MANAGER_PASSWORD ?? DEFAULT_PASSWORD;
const staffEmail = process.env.DEMO_STAFF_EMAIL ?? "staff@requo.local";
const staffPassword = process.env.DEMO_STAFF_PASSWORD ?? DEFAULT_PASSWORD;
const pendingInviteEmail =
  process.env.DEMO_PENDING_INVITE_EMAIL ?? "pending-invite@requo.local";
const pendingInvitePassword =
  process.env.DEMO_PENDING_INVITE_PASSWORD ?? DEFAULT_PASSWORD;
const pendingInviteToken =
  process.env.DEMO_PENDING_INVITE_TOKEN ?? "demo-business-invite-token";
const outsiderEmail = process.env.DEMO_OUTSIDER_EMAIL ?? "outsider@requo.local";
const outsiderPassword = process.env.DEMO_OUTSIDER_PASSWORD ?? DEFAULT_PASSWORD;

const primaryBusinessName = env.DEMO_BUSINESS_NAME ?? "BrightSide Print Studio";
const primaryBusinessSlug =
  env.DEMO_BUSINESS_SLUG ?? "brightside-print-studio";
const publicQuoteToken =
  env.DEMO_QUOTE_PUBLIC_TOKEN ?? "demoquote1002senttoken";
const expiredQuoteToken =
  env.DEMO_EXPIRED_QUOTE_PUBLIC_TOKEN ?? "demoquote1005expiredtoken";
const voidedQuoteToken =
  env.DEMO_VOIDED_QUOTE_PUBLIC_TOKEN ?? "demoquote1006voidedtoken";

type TeamMemberSeed = {
  name: string;
  email: string;
  password: string;
  businessRole: "manager" | "staff";
};

type BusinessSeed = {
  name: string;
  slug: string;
  businessType: BusinessType;
  shortDescription: string;
  customerContactChannel: string;
  defaultCurrency: string;
  countryCode: string;
  contactEmail: string;
  aiTonePreference: "balanced" | "warm" | "direct" | "formal";
  inquiryCount: number;
  quoteRatio: number;
  defaultFormName?: string;
  defaultFormSlug?: string;
};

type AccountSeed = {
  name: string;
  email: string;
  password: string;
  plan: BusinessPlan;
  businesses: BusinessSeed[];
  teamMembers?: TeamMemberSeed[];
};

type CreatedBusiness = {
  businessId: string;
  formId: string;
};

const primaryAccount: AccountSeed = {
  name: env.DEMO_OWNER_NAME ?? "Mark Louie",
  email: ownerEmail,
  password: ownerPassword,
  plan: "business",
  businesses: [
    {
      name: primaryBusinessName,
      slug: primaryBusinessSlug,
      businessType: "print_signage",
      shortDescription:
        "Print, signage, and display graphics for storefronts, events, and campaigns.",
      customerContactChannel: "Public inquiry page, email, and referrals",
      defaultCurrency: "USD",
      countryCode: "US",
      contactEmail: "hello@brightsideprint.com",
      aiTonePreference: "balanced",
      inquiryCount: 18,
      quoteRatio: 0.58,
      defaultFormName: "Project request",
      defaultFormSlug: "project-request",
    },
  ],
  teamMembers: [
    {
      name: "Ava Morris",
      email: managerEmail,
      password: managerPassword,
      businessRole: "manager",
    },
    {
      name: "Noah Price",
      email: staffEmail,
      password: staffPassword,
      businessRole: "staff",
    },
  ],
};

const seedAccounts = mergeSeedAccounts([
  primaryAccount,
  {
    name: "Mark Louie",
    email: "marklouie.dev@gmail.com",
    password: ownerPassword,
    plan: "business",
    businesses: [
      {
        name: "Mark Louie Studio",
        slug: "mark-louie-studio",
        businessType: "creative_marketing_services",
        shortDescription:
          "Brand, web, and marketing design studio for growing service businesses.",
        customerContactChannel: "Website form and warm referrals",
        defaultCurrency: "USD",
        countryCode: "PH",
        contactEmail: "hello@marklouie.dev",
        aiTonePreference: "balanced",
        inquiryCount: 20,
        quoteRatio: 0.5,
      },
    ],
  },
  {
    name: "Maria Santos",
    email: "free@requo.dev",
    password: DEFAULT_PASSWORD,
    plan: "free",
    businesses: [
      {
        name: "Santos Print Shop",
        slug: "demo-business",
        businessType: "print_signage",
        shortDescription:
          "Neighborhood print shop handling small business signage, menus, and event displays.",
        customerContactChannel: "Walk-ins and public inquiry form",
        defaultCurrency: "USD",
        countryCode: "PH",
        contactEmail: "maria@santosprint.ph",
        aiTonePreference: "warm",
        inquiryCount: 10,
        quoteRatio: 0.45,
      },
    ],
  },
  {
    name: "James Carter",
    email: "pro@requo.dev",
    password: DEFAULT_PASSWORD,
    plan: "pro",
    businesses: [
      {
        name: "Carter Studio",
        slug: "carter-studio",
        businessType: "creative_marketing_services",
        shortDescription:
          "Creative studio quoting brand, content, and website projects for growing teams.",
        customerContactChannel: "Referral partners and project inquiry page",
        defaultCurrency: "USD",
        countryCode: "US",
        contactEmail: "james@carterstudio.com",
        aiTonePreference: "balanced",
        inquiryCount: 16,
        quoteRatio: 0.56,
      },
    ],
  },
  {
    name: "Rafael Reyes",
    email: "business@requo.dev",
    password: DEFAULT_PASSWORD,
    plan: "business",
    businesses: [
      {
        name: "Reyes Contractors",
        slug: "reyes-contractors",
        businessType: "contractor_home_improvement",
        shortDescription:
          "Renovation and fit-out contractor managing scoped project requests and site follow-ups.",
        customerContactChannel: "Phone, referrals, and public project request form",
        defaultCurrency: "USD",
        countryCode: "PH",
        contactEmail: "info@reyescontractors.ph",
        aiTonePreference: "direct",
        inquiryCount: 18,
        quoteRatio: 0.5,
      },
      {
        name: "Reyes Event Services",
        slug: "reyes-event-services",
        businessType: "event_services_rentals",
        shortDescription:
          "Event setup, tent rentals, and AV production for corporate and community events.",
        customerContactChannel: "Public inquiry page and coordinator referrals",
        defaultCurrency: "USD",
        countryCode: "PH",
        contactEmail: "events@reyesgroup.ph",
        aiTonePreference: "warm",
        inquiryCount: 12,
        quoteRatio: 0.5,
      },
    ],
    teamMembers: [
      {
        name: "Ana Mendez",
        email: "manager@requo.dev",
        password: DEFAULT_PASSWORD,
        businessRole: "manager",
      },
      {
        name: "Paolo Cruz",
        email: "staff@requo.dev",
        password: DEFAULT_PASSWORD,
        businessRole: "staff",
      },
    ],
  },
]);

const businessTypeCategories: Record<BusinessType, string[]> = {
  contractor_home_improvement: [
    "Kitchen renovation",
    "Bathroom remodel",
    "Deck repair",
    "Office build-out",
    "Flooring install",
  ],
  print_signage: [
    "Storefront signage",
    "Event signage",
    "Vehicle decals",
    "Office wayfinding",
    "Menu boards",
  ],
  fabrication_custom_build: [
    "Custom counter build",
    "Metal sign frame",
    "Retail display",
    "Millwork package",
  ],
  creative_marketing_services: [
    "Brand refresh",
    "Website design",
    "Campaign creative",
    "Social content package",
    "Launch collateral",
  ],
  web_it_services: [
    "Website build",
    "Automation setup",
    "System migration",
    "Managed support",
  ],
  photo_video_production: [
    "Product shoot",
    "Event coverage",
    "Interview video",
    "Editing package",
  ],
  event_services_rentals: [
    "Tent rental",
    "Stage and AV setup",
    "Corporate event package",
    "Backdrop install",
  ],
  landscaping_outdoor_services: [
    "Patio refresh",
    "Garden cleanup",
    "Irrigation repair",
    "Monthly maintenance",
  ],
  repair_services: [
    "Equipment repair",
    "Diagnostic visit",
    "Parts replacement",
    "Preventive maintenance",
  ],
  consulting_professional_services: [
    "Strategy workshop",
    "Operations audit",
    "Advisory retainer",
    "Team training",
  ],
  cleaning_services: [
    "Deep cleaning",
    "Move-out cleaning",
    "Office cleaning",
    "Post-renovation cleanup",
  ],
  general_project_services: [
    "Custom project",
    "Service package",
    "On-site consultation",
    "Rush request",
  ],
};

const quoteItemTemplates: Record<BusinessType, Array<{ desc: string; min: number; max: number }>> = {
  contractor_home_improvement: [
    { desc: "Site preparation and protection", min: 35000, max: 80000 },
    { desc: "Labor and installation", min: 90000, max: 260000 },
    { desc: "Materials allowance", min: 70000, max: 220000 },
    { desc: "Cleanup and handover", min: 18000, max: 45000 },
  ],
  print_signage: [
    { desc: "Design setup and proofing", min: 12000, max: 35000 },
    { desc: "Printed panels", min: 45000, max: 140000 },
    { desc: "Vinyl graphics", min: 18000, max: 90000 },
    { desc: "Installation", min: 25000, max: 95000 },
  ],
  fabrication_custom_build: [
    { desc: "Shop drawings", min: 25000, max: 70000 },
    { desc: "Fabrication labor", min: 120000, max: 320000 },
    { desc: "Materials", min: 80000, max: 260000 },
    { desc: "Delivery and install", min: 35000, max: 95000 },
  ],
  creative_marketing_services: [
    { desc: "Discovery and creative direction", min: 45000, max: 120000 },
    { desc: "Design production", min: 90000, max: 240000 },
    { desc: "Revision round", min: 25000, max: 65000 },
    { desc: "Final asset delivery", min: 15000, max: 45000 },
  ],
  web_it_services: [
    { desc: "Technical discovery", min: 35000, max: 85000 },
    { desc: "Implementation sprint", min: 120000, max: 360000 },
    { desc: "Testing and handoff", min: 40000, max: 90000 },
  ],
  photo_video_production: [
    { desc: "Pre-production planning", min: 35000, max: 90000 },
    { desc: "Production day", min: 90000, max: 220000 },
    { desc: "Editing and delivery", min: 65000, max: 180000 },
  ],
  event_services_rentals: [
    { desc: "Rental package", min: 65000, max: 180000 },
    { desc: "Crew setup and strike", min: 45000, max: 140000 },
    { desc: "Transport", min: 25000, max: 80000 },
  ],
  landscaping_outdoor_services: [
    { desc: "Site cleanup", min: 25000, max: 75000 },
    { desc: "Materials and plants", min: 45000, max: 160000 },
    { desc: "Crew labor", min: 55000, max: 180000 },
  ],
  repair_services: [
    { desc: "Diagnostic visit", min: 12000, max: 35000 },
    { desc: "Replacement parts", min: 25000, max: 140000 },
    { desc: "Repair labor", min: 30000, max: 120000 },
  ],
  consulting_professional_services: [
    { desc: "Discovery session", min: 35000, max: 90000 },
    { desc: "Analysis and recommendations", min: 90000, max: 240000 },
    { desc: "Implementation workshop", min: 60000, max: 180000 },
  ],
  cleaning_services: [
    { desc: "Crew labor", min: 25000, max: 110000 },
    { desc: "Supplies and equipment", min: 12000, max: 45000 },
    { desc: "Final inspection", min: 8000, max: 25000 },
  ],
  general_project_services: [
    { desc: "Project setup", min: 25000, max: 75000 },
    { desc: "Service delivery", min: 65000, max: 220000 },
    { desc: "Review and handoff", min: 15000, max: 50000 },
  ],
};

const firstNames = [
  "Alicia",
  "Ben",
  "Camille",
  "Diego",
  "Elena",
  "Farah",
  "Grant",
  "Hannah",
  "Ivan",
  "Jules",
  "Kara",
  "Leo",
  "Mina",
  "Owen",
  "Priya",
  "Renee",
];

const lastNames = [
  "Bennett",
  "Cruz",
  "Diaz",
  "Flores",
  "Garcia",
  "Kim",
  "Lopez",
  "Morgan",
  "Patel",
  "Reyes",
  "Santos",
  "Tan",
  "Walker",
  "Young",
];

const inquiryDetails = [
  "Please review the scope and send a quote with available timing.",
  "We need pricing options and the earliest possible production window.",
  "The project is approved internally, but we need a final quote before scheduling.",
  "Can you confirm what information is still needed before you price this?",
  "We have references ready and can send files after the quote is started.",
  "This is time-sensitive, so please call out any rush fee or schedule risk.",
];

const resetTableNames = [
  "admin_audit_logs",
  "activity_logs",
  "ai_drafts",
  "ai_messages",
  "ai_conversations",
  "ai_usage_events",
  "ai_token_logs",
  "audit_logs",
  "analytics_events",
  "business_notification_reads",
  "business_notification_states",
  "business_notifications",
  "email_attempts",
  "email_outbox",
  "follow_ups",
  "post_win_checklist_items",
  "quote_items",
  "quotes",
  "inquiry_notes",
  "inquiry_attachments",
  "inquiry_messages",
  "inquiries",
  "quote_library_entry_items",
  "quote_library_entries",
  "reply_snippets",
  "business_memories",
  "business_member_invites",
  "business_members",
  "user_recent_businesses",
  "business_inquiry_forms",
  "businesses",
  "payment_attempts",
  "refunds",
  "billing_events",
  "account_subscriptions",
  "business_subscriptions",
  "push_subscriptions",
  "profiles",
  "account",
  "session",
  "verification",
  "rate_limit",
  "user",
  "public_action_events",
] as const;

let idCounter = 0;
const seedNow = new Date();

function id(prefix: string) {
  idCounter += 1;
  return `demo_${prefix}_${idCounter.toString().padStart(5, "0")}`;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function createRng(seed: string) {
  let hash = 2166136261;

  for (const ch of seed) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return () => {
    hash += 0x6d2b79f5;
    let value = Math.imul(hash ^ (hash >>> 15), 1 | hash);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, values: readonly T[]): T {
  return values[Math.floor(rng() * values.length)];
}

function chance(rng: () => number, probability: number) {
  return rng() < probability;
}

function randInt(rng: () => number, min: number, maxExclusive: number) {
  return Math.floor(rng() * (maxExclusive - min)) + min;
}

function pickWeighted<T extends string>(
  rng: () => number,
  weightedValues: ReadonlyArray<readonly [T, number]>,
): T {
  const total = weightedValues.reduce((sum, [, weight]) => sum + weight, 0);
  let cursor = rng() * total;

  for (const [value, weight] of weightedValues) {
    cursor -= weight;

    if (cursor <= 0) {
      return value;
    }
  }

  return weightedValues[weightedValues.length - 1][0];
}

function daysAgo(days: number, hour = 12, minute = 0) {
  const date = new Date(seedNow);
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(hour, minute, 0, 0);
  return date;
}

function daysFromNow(days: number, hour = 12, minute = 0) {
  const date = new Date(seedNow);
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour, minute, 0, 0);
  return date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function todayAtUtc(hour = 15, minute = 0) {
  const date = new Date(seedNow);
  date.setUTCHours(hour, minute, 0, 0);
  return date;
}

function toDateStr(date: Date) {
  return date.toISOString().slice(0, 10);
}

function hashOpaqueToken(token: string) {
  return createHmac("sha256", env.APP_TOKEN_HASH_SECRET ?? env.BETTER_AUTH_SECRET)
    .update(token)
    .digest("base64url");
}

function tokenFields(rawToken: string) {
  return {
    publicToken: rawToken,
    publicTokenHash: hashOpaqueToken(rawToken),
  };
}

function safeAccountKey(email: string) {
  return normalizeEmail(email).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function getPlanRank(plan: BusinessPlan) {
  return plan === "business" ? 3 : plan === "pro" ? 2 : 1;
}

function mergeSeedAccounts(accounts: AccountSeed[]) {
  const merged = new Map<string, AccountSeed>();

  for (const account of accounts) {
    const key = normalizeEmail(account.email);
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, {
        ...account,
        email: key,
        teamMembers: account.teamMembers ? [...account.teamMembers] : undefined,
        businesses: [...account.businesses],
      });
      continue;
    }

    if (getPlanRank(account.plan) > getPlanRank(existing.plan)) {
      existing.plan = account.plan;
    }

    for (const business of account.businesses) {
      if (!existing.businesses.some((item) => item.slug === business.slug)) {
        existing.businesses.push(business);
      }
    }

    for (const member of account.teamMembers ?? []) {
      const members = existing.teamMembers ?? [];

      if (!members.some((item) => normalizeEmail(item.email) === normalizeEmail(member.email))) {
        members.push(member);
      }

      existing.teamMembers = members;
    }
  }

  return Array.from(merged.values());
}

function createSubmittedFieldSnapshot(input: {
  businessType: BusinessType;
  customerName: string;
  contactMethod: string;
  contactHandle: string;
  serviceCategory: string;
  requestedDeadline?: string | null;
  budgetText?: string | null;
  details: string;
  extras?: Array<{ id: string; label: string; value: string | boolean }>;
}): InquirySubmittedFieldSnapshot {
  const fields: InquirySubmittedFieldSnapshot["fields"] = [
    {
      id: "customerName",
      label: "Name",
      value: input.customerName,
      displayValue: input.customerName,
      fieldKind: "contact",
    },
    {
      id: "preferredContact",
      label: "Preferred Contact Method",
      value: input.contactHandle,
      displayValue: `${input.contactMethod}: ${input.contactHandle}`,
      fieldKind: "contact",
    },
    {
      id: "serviceCategory",
      label: "Service",
      value: input.serviceCategory,
      displayValue: input.serviceCategory,
      fieldKind: "system",
    },
    {
      id: "requestedDeadline",
      label: "Deadline",
      value: input.requestedDeadline ?? null,
      displayValue: input.requestedDeadline ?? "Not provided",
      fieldKind: "system",
    },
    {
      id: "budgetText",
      label: "Budget",
      value: input.budgetText ?? null,
      displayValue: input.budgetText ?? "Not provided",
      fieldKind: "system",
    },
    {
      id: "details",
      label: "Message",
      value: input.details,
      displayValue: input.details,
      fieldKind: "system",
    },
  ];

  for (const extra of input.extras ?? []) {
    fields.push({
      id: extra.id,
      label: extra.label,
      value: extra.value,
      displayValue: typeof extra.value === "boolean" ? (extra.value ? "Yes" : "No") : extra.value,
      fieldKind: "custom",
    });
  }

  return {
    version: 1,
    businessType: input.businessType,
    fields,
  };
}

let cachedAuth: typeof import("../lib/auth/config").auth | null = null;

async function getAuth() {
  if (!cachedAuth) {
    const authModule = await import("../lib/auth/config");
    cachedAuth = authModule.auth;
  }

  return cachedAuth;
}

async function resetDatabase() {
  if (env.NODE_ENV === "production") {
    throw new Error("Refusing to run the demo seeder in production.");
  }

  const resetTableArray = resetTableNames
    .map((tableName) => `'${tableName}'`)
    .join(", ");

  console.log("Resetting public app tables...");

  await db.execute(
    sql.raw(`
      DO $$
      DECLARE
        existing_tables text;
      BEGIN
        SELECT string_agg(format('%I', tablename), ', ')
        INTO existing_tables
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename = ANY(ARRAY[${resetTableArray}]);

        IF existing_tables IS NOT NULL THEN
          EXECUTE 'TRUNCATE TABLE ' || existing_tables || ' RESTART IDENTITY CASCADE';
        END IF;
      END
      $$;
    `),
  );
}

const createdUsersByEmail = new Map<string, string>();

async function ensureUserAccount(input: {
  name: string;
  email: string;
  password: string;
}) {
  const email = normalizeEmail(input.email);
  const cachedId = createdUsersByEmail.get(email);

  if (cachedId) {
    return cachedId;
  }

  const auth = await getAuth();
  const result = await auth.api.signUpEmail({
    body: {
      name: input.name,
      email,
      password: input.password,
    },
  });

  if (!result?.user?.id) {
    throw new Error(`Failed to create user account for ${email}.`);
  }

  const userId = result.user.id;

  // Set admin role for marklouie.dev@gmail.com
  const isAdmin = email === "marklouie.dev@gmail.com";

  await db
    .update(user)
    .set({
      emailVerified: true,
      role: isAdmin ? "admin" : undefined,
      updatedAt: seedNow,
    })
    .where(eq(user.id, userId));

  await db
    .insert(profiles)
    .values({
      userId,
      fullName: input.name,
      onboardingCompletedAt: daysAgo(45),
      dashboardTourCompletedAt: daysAgo(44),
      formEditorTourCompletedAt: daysAgo(43),
      themePreference: "system",
      createdAt: daysAgo(45),
      updatedAt: seedNow,
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        fullName: input.name,
        onboardingCompletedAt: daysAgo(45),
        dashboardTourCompletedAt: daysAgo(44),
        formEditorTourCompletedAt: daysAgo(43),
        updatedAt: seedNow,
      },
    });

  createdUsersByEmail.set(email, userId);

  if (isAdmin) {
    console.log(`    ✓ ${email} created with admin role`);
  }

  return userId;
}

async function seedBusinessBilling(
  businessId: string,
  businessSlug: string,
  plan: BusinessPlan,
) {
  if (plan === "free") {
    return;
  }

  const businessKey = businessSlug.replace(/[^a-z0-9]+/g, "_");
  const periodStart = daysAgo(12);
  const periodEnd = daysFromNow(18);
  const amount = plan === "business" ? 7900 : 2900;
  const paymentId = `pay_demo_${businessKey}`;
  const subscriptionId = `sub_demo_${businessKey}`;

  await db.insert(businessSubscriptions).values({
    id: id("sub"),
    businessId,
    status: "active",
    plan,
    billingProvider: "polar",
    billingCurrency: "USD",
    providerCustomerId: `cus_demo_${businessKey}`,
    providerSubscriptionId: subscriptionId,
    paymentMethod: "card",
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    createdAt: daysAgo(72),
    updatedAt: seedNow,
  });

  await db.insert(paymentAttempts).values({
    id: id("pay"),
    businessId,
    plan,
    provider: "polar",
    providerPaymentId: paymentId,
    amount,
    currency: "USD",
    status: "succeeded",
    createdAt: periodStart,
  });

  await db.insert(billingEvents).values({
    id: id("bill_evt"),
    providerEventId: `evt_demo_subscription_active_${businessKey}`,
    provider: "polar",
    eventType: "subscription.active",
    businessId,
    payload: {
      demo: true,
      plan,
      providerPaymentId: paymentId,
      providerSubscriptionId: subscriptionId,
    },
    status: "processed",
    processedAt: periodStart,
    createdAt: periodStart,
  });
}

async function createBusiness(
  account: AccountSeed,
  business: BusinessSeed,
  ownerUserId: string,
): Promise<CreatedBusiness> {
  const businessId = id("biz");
  const formId = id("form");
  const preset = createInquiryFormPreset({
    businessType: business.businessType,
    businessName: business.name,
    businessShortDescription: business.shortDescription,
    plan: account.plan,
  });
  const inquiryFormConfig = preset.inquiryFormConfig;
  const inquiryPageConfig = {
    ...preset.inquiryPageConfig,
    businessContact: {
      email: business.contactEmail,
    },
  };
  const formName = business.defaultFormName ?? preset.name;
  const formSlug = business.defaultFormSlug ?? preset.slug;
  const createdAt = daysAgo(90);
  const defaultQuoteNotes =
    "Prices are valid for 14 days unless noted. A deposit may be required before scheduling production or site work.";

  await db.insert(businesses).values({
    id: businessId,
    ownerUserId,
    name: business.name,
    slug: business.slug,
    plan: account.plan,
    businessType: business.businessType,
    countryCode: business.countryCode,
    shortDescription: business.shortDescription,
    customerContactChannel: business.customerContactChannel,
    contactEmail: business.contactEmail,
    publicInquiryEnabled: true,
    inquiryHeadline: `Tell ${business.name} what you need quoted.`,
    inquiryFormConfig,
    inquiryPageConfig,
    defaultEmailSignature: `${business.name}\n${business.contactEmail}`,
    defaultQuoteNotes,
    defaultQuoteValidityDays: 14,
    aiTonePreference: business.aiTonePreference,
    notifyOnNewInquiry: true,
    notifyOnQuoteSent: true,
    notifyOnQuoteResponse: true,
    notifyInAppOnNewInquiry: true,
    notifyInAppOnQuoteSent: true,
    notifyInAppOnQuoteResponse: true,
    notifyOnMemberInviteResponse: true,
    notifyInAppOnMemberInviteResponse: true,
    notifyPushOnNewInquiry: false,
    notifyPushOnQuoteSent: false,
    notifyPushOnQuoteResponse: false,
    notifyPushOnMemberInviteResponse: false,
    notifyOnFollowUpReminder: true,
    notifyInAppOnFollowUpReminder: true,
    notifyOnQuoteExpiring: true,
    notifyInAppOnQuoteExpiring: true,
    defaultCurrency: business.defaultCurrency,
    createdAt,
    updatedAt: seedNow,
  });

  await db.insert(businessInquiryForms).values({
    id: formId,
    businessId,
    name: formName,
    slug: formSlug,
    businessType: business.businessType,
    isDefault: true,
    publicInquiryEnabled: true,
    inquiryFormConfig,
    inquiryPageConfig,
    createdAt,
    updatedAt: seedNow,
  });

  await db.insert(businessMembers).values({
    id: id("member"),
    businessId,
    userId: ownerUserId,
    role: "owner",
    dashboardTourCompletedAt: daysAgo(44),
    createdAt,
    updatedAt: seedNow,
  });

  await db.insert(userRecentBusinesses).values({
    userId: ownerUserId,
    businessId,
    lastOpenedAt: daysAgo(1),
    createdAt,
    updatedAt: seedNow,
  });

  await seedBusinessDefaults({
    businessId,
    business,
    ownerUserId,
    plan: account.plan,
  });

  return { businessId, formId };
}

async function seedBusinessDefaults(input: {
  businessId: string;
  business: BusinessSeed;
  ownerUserId: string;
  plan: BusinessPlan;
}) {
  const memories: Array<typeof businessMemories.$inferInsert> = [
    {
      id: id("mem"),
      businessId: input.businessId,
      title: "Quoting standard",
      content:
        "Confirm scope, customer timing, delivery location, and approval deadline before sending final pricing.",
      position: 0,
      createdAt: daysAgo(85),
      updatedAt: daysAgo(85),
    },
    {
      id: id("mem"),
      businessId: input.businessId,
      title: "Follow-up rhythm",
      content:
        "Follow up one business day after a quote is viewed and again two days before the quote expires.",
      position: 1,
      createdAt: daysAgo(85),
      updatedAt: daysAgo(85),
    },
    {
      id: id("mem"),
      businessId: input.businessId,
      title: "Missing info checklist",
      content:
        "Flag missing event date, guest count, package preference, budget, site address, and delivery deadline before drafting a quote.",
      position: 2,
      createdAt: daysAgo(84),
      updatedAt: daysAgo(84),
    },
  ];

  await db.insert(businessMemories).values(memories);

  await db.insert(replySnippets).values([
    {
      id: id("snippet"),
      businessId: input.businessId,
      title: "Confirm missing quote details",
      body:
        "Hi! Thanks for your inquiry. Before I send the final quote, may I confirm the event date, number of guests, preferred package, and delivery deadline?",
      createdAt: daysAgo(80),
      updatedAt: daysAgo(80),
    },
    {
      id: id("snippet"),
      businessId: input.businessId,
      title: "Quote follow-up",
      body:
        "Hi! Just checking whether you had questions about the quote or want us to reserve production time.",
      createdAt: daysAgo(79),
      updatedAt: daysAgo(79),
    },
    {
      id: id("snippet"),
      businessId: input.businessId,
      title: "Accepted quote next step",
      body:
        "Thanks for accepting the quote. I will confirm the schedule and next production steps shortly.",
      createdAt: daysAgo(78),
      updatedAt: daysAgo(78),
    },
  ]);

  await seedQuoteLibrary({
    businessId: input.businessId,
    businessType: input.business.businessType,
    currency: input.business.defaultCurrency,
  });

  await db.insert(auditLogs).values({
    id: id("audit"),
    businessId: input.businessId,
    actorUserId: input.ownerUserId,
    entityType: "business",
    entityId: input.businessId,
    action: "business.seeded",
    metadata: {
      plan: input.plan,
      businessType: input.business.businessType,
    },
    source: "seed",
    createdAt: daysAgo(85),
  });
}

async function seedQuoteLibrary(input: {
  businessId: string;
  businessType: BusinessType;
  currency: string;
}) {
  const templates = quoteItemTemplates[input.businessType] ?? quoteItemTemplates.general_project_services;
  const entryRows: Array<typeof quoteLibraryEntries.$inferInsert> = [
    {
      id: id("qle"),
      businessId: input.businessId,
      kind: "package",
      currency: input.currency,
      name: "Starter package",
      description: "Reusable baseline package for common qualified inquiries.",
      createdAt: daysAgo(82),
      updatedAt: daysAgo(82),
    },
    {
      id: id("qle"),
      businessId: input.businessId,
      kind: "block",
      currency: input.currency,
      name: "Rush handling",
      description: "Optional rush review, scheduling, or production block.",
      createdAt: daysAgo(81),
      updatedAt: daysAgo(81),
    },
  ];
  const itemRows: Array<typeof quoteLibraryEntryItems.$inferInsert> = [];

  templates.slice(0, 3).forEach((item, position) => {
    itemRows.push({
      id: id("qli"),
      businessId: input.businessId,
      entryId: entryRows[0].id,
      description: item.desc,
      quantity: 1,
      unitPriceInCents: Math.round((item.min + item.max) / 2),
      position,
      createdAt: daysAgo(82),
      updatedAt: daysAgo(82),
    });
  });

  itemRows.push({
    id: id("qli"),
    businessId: input.businessId,
    entryId: entryRows[1].id,
    description: "Priority scheduling and coordination",
    quantity: 1,
    unitPriceInCents: 35000,
    position: 0,
    createdAt: daysAgo(81),
    updatedAt: daysAgo(81),
  });

  await db.insert(quoteLibraryEntries).values(entryRows);
  await db.insert(quoteLibraryEntryItems).values(itemRows);
}

async function addTeamMembersToBusiness(input: {
  businessId: string;
  teamMembers: TeamMemberSeed[];
}) {
  for (const teamMember of input.teamMembers) {
    const userId = await ensureUserAccount({
      name: teamMember.name,
      email: teamMember.email,
      password: teamMember.password,
    });

    await db.insert(businessMembers).values({
      id: id("member"),
      businessId: input.businessId,
      userId,
      role: teamMember.businessRole,
      createdAt: daysAgo(42),
      updatedAt: seedNow,
    });

    await db.insert(userRecentBusinesses).values({
      userId,
      businessId: input.businessId,
      lastOpenedAt: daysAgo(teamMember.businessRole === "manager" ? 2 : 3),
      createdAt: daysAgo(42),
      updatedAt: seedNow,
    });
  }
}

async function seedPendingInvite(input: {
  businessId: string;
  inviterUserId: string;
}) {
  await ensureUserAccount({
    name: "Pending Invite",
    email: pendingInviteEmail,
    password: pendingInvitePassword,
  });

  await db.insert(businessMemberInvites).values({
    id: "demo_pending_member_invite",
    businessId: input.businessId,
    inviterUserId: input.inviterUserId,
    email: normalizeEmail(pendingInviteEmail),
    role: "staff",
    token: pendingInviteToken,
    tokenHash: hashOpaqueToken(pendingInviteToken),
    expiresAt: daysFromNow(30),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  });
}

async function seedGeneratedBusinessData(input: {
  business: BusinessSeed;
  businessId: string;
  formId: string;
  ownerUserId: string;
}) {
  const rng = createRng(input.business.slug);
  const categories =
    businessTypeCategories[input.business.businessType] ??
    businessTypeCategories.general_project_services;
  const itemTemplates =
    quoteItemTemplates[input.business.businessType] ??
    quoteItemTemplates.general_project_services;
  const inquiryRows: Array<typeof inquiries.$inferInsert> = [];
  const quoteRows: Array<typeof quotes.$inferInsert> = [];
  const quoteItemRows: Array<typeof quoteItems.$inferInsert> = [];
  const activityRows: Array<typeof activityLogs.$inferInsert> = [];
  const noteRows: Array<typeof inquiryNotes.$inferInsert> = [];
  const followUpRows: Array<typeof followUps.$inferInsert> = [];
  const analyticsRows: Array<typeof analyticsEvents.$inferInsert> = [];
  const notificationRows: Array<typeof businessNotifications.$inferInsert> = [];
  let quoteNumber = 2001;

  for (let index = 0; index < input.business.inquiryCount; index += 1) {
    const inquiryId = id("inq");
    const firstName = pick(rng, firstNames);
    const lastName = pick(rng, lastNames);
    const customerName = `${firstName} ${lastName}`;
    const customerEmail = `${firstName}.${lastName}@example.com`.toLowerCase();
    const customerPhone = `+1 415 555 ${randInt(rng, 1000, 9999)}`;
    const contactMethod = chance(rng, 0.58) ? "email" : "phone";
    const contactHandle = contactMethod === "email" ? customerEmail : customerPhone;
    const serviceCategory = pick(rng, categories);
    const submittedAt = daysAgo(randInt(rng, 1, 70), randInt(rng, 8, 18), randInt(rng, 0, 60));
    const status = pickWeighted(rng, [
      ["new", 18],
      ["waiting", 18],
      ["quoted", 20],
      ["won", 12],
      ["lost", 9],
      ["overdue", 8],
      ["archived", 6],
    ] as const);
    const requestedDeadline = chance(rng, 0.56)
      ? toDateStr(addDays(submittedAt, randInt(rng, status === "overdue" ? -4 : 5, 42)))
      : null;
    const budgetText = chance(rng, 0.58)
      ? `$${randInt(rng, 8, 30) * 100} - $${randInt(rng, 35, 95) * 100}`
      : null;
    const details = pick(rng, inquiryDetails);
    const archivedAt = status === "archived" ? addDays(submittedAt, randInt(rng, 4, 14)) : null;

    inquiryRows.push({
      id: inquiryId,
      businessId: input.businessId,
      businessInquiryFormId: input.formId,
      status,
      subject: serviceCategory,
      customerName,
      customerEmail,
      customerContactMethod: contactMethod,
      customerContactHandle: contactHandle,
      serviceCategory,
      requestedDeadline,
      budgetText,
      details,
      submittedFieldSnapshot: createSubmittedFieldSnapshot({
        businessType: input.business.businessType,
        customerName,
        contactMethod,
        contactHandle,
        serviceCategory,
        requestedDeadline,
        budgetText,
        details,
      }),
      source: index % 3 === 0 ? "manual" : "public_form",
      quoteRequested: status !== "archived",
      submittedAt,
      lastRespondedAt: ["quoted", "won", "lost", "waiting"].includes(status)
        ? addDays(submittedAt, randInt(rng, 1, 5))
        : null,
      archivedAt,
      archivedBy: archivedAt ? input.ownerUserId : null,
      createdAt: submittedAt,
      updatedAt: archivedAt ?? submittedAt,
    });

    activityRows.push({
      id: id("act"),
      businessId: input.businessId,
      inquiryId,
      actorUserId: status === "new" ? null : input.ownerUserId,
      type: "inquiry.submitted",
      summary: `${customerName} submitted an inquiry for ${serviceCategory}.`,
      metadata: {
        source: index % 3 === 0 ? "manual" : "public_form",
      },
      createdAt: submittedAt,
      updatedAt: submittedAt,
    });

    analyticsRows.push({
      id: id("analytics"),
      businessId: input.businessId,
      businessInquiryFormId: input.formId,
      eventType: "inquiry_form_viewed",
      visitorHash: hashOpaqueToken(`${input.businessId}:${index}:form`),
      occurredAt: addDays(submittedAt, -1),
    });

    if (index < 3 && status === "new") {
      notificationRows.push({
        id: id("notification"),
        businessId: input.businessId,
        inquiryId,
        type: "public_inquiry_submitted",
        title: "New inquiry received",
        summary: `${customerName} asked about ${serviceCategory}.`,
        metadata: {
          source: "seed",
        },
        createdAt: submittedAt,
        updatedAt: submittedAt,
      });
    }

    if (chance(rng, 0.24)) {
      noteRows.push({
        id: id("note"),
        businessId: input.businessId,
        inquiryId,
        authorUserId: input.ownerUserId,
        body: "Review scope before quoting. Confirm any missing timing or delivery details first.",
        createdAt: addDays(submittedAt, 1),
        updatedAt: addDays(submittedAt, 1),
      });
    }

    if (
      status !== "new" &&
      status !== "archived" &&
      chance(rng, input.business.quoteRatio)
    ) {
      const quoteId = id("quote");
      const quoteCreatedAt = addDays(submittedAt, randInt(rng, 1, 4));
      const sentAt = addDays(quoteCreatedAt, randInt(rng, 0, 2));
      const quoteStatus =
        status === "won"
          ? "accepted"
          : status === "lost"
            ? "rejected"
            : status === "overdue"
              ? "expired"
              : pickWeighted(rng, [
                ["draft", 8],
                ["sent", 58],
                ["accepted", 18],
                ["rejected", 10],
                ["voided", 6],
              ] as const);
      const quoteNumberText = `Q-${quoteNumber}`;
      quoteNumber += 1;
      const lineItems = buildQuoteItems({
        businessId: input.businessId,
        quoteId,
        templates: itemTemplates,
        rng,
        createdAt: quoteCreatedAt,
      });
      const subtotal = lineItems.reduce(
        (sum, item) => sum + (item.lineTotalInCents ?? 0),
        0,
      );
      const discount = chance(rng, 0.18) ? Math.floor(subtotal * 0.08) : 0;
      const acceptedAt =
        quoteStatus === "accepted" ? addDays(sentAt, randInt(rng, 1, 6)) : null;
      const rejectedAt =
        quoteStatus === "rejected" ? addDays(sentAt, randInt(rng, 1, 8)) : null;
      const voidedAt =
        quoteStatus === "voided" ? addDays(sentAt, randInt(rng, 1, 6)) : null;
      const rawToken = `${input.business.slug}-${quoteNumberText.toLowerCase()}-token`;

      quoteRows.push({
        id: quoteId,
        businessId: input.businessId,
        inquiryId,
        status: quoteStatus,
        quoteNumber: quoteNumberText,
        ...tokenFields(rawToken),
        title: `${serviceCategory} quote`,
        customerName,
        customerEmail,
        customerContactMethod: contactMethod,
        customerContactHandle: contactHandle,
        currency: input.business.defaultCurrency,
        notes:
          "Quote prepared from the inquiry details. Please confirm timing before production is reserved.",
        subtotalInCents: subtotal,
        discountInCents: discount,
        totalInCents: subtotal - discount,
        sentAt: quoteStatus === "draft" ? null : sentAt,
        acceptedAt,
        publicViewedAt: quoteStatus === "draft" ? null : addDays(sentAt, randInt(rng, 0, 3)),
        customerRespondedAt: acceptedAt ?? rejectedAt,
        customerResponseMessage:
          quoteStatus === "accepted"
            ? "Approved. Please confirm the schedule."
            : quoteStatus === "rejected"
              ? "Thanks, but we are going another direction."
              : null,
        postAcceptanceStatus:
          quoteStatus === "accepted" ? pick(rng, ["none", "booked", "scheduled"] as const) : "none",
        validUntil:
          quoteStatus === "expired"
            ? toDateStr(daysAgo(randInt(rng, 1, 8)))
            : toDateStr(daysFromNow(randInt(rng, 3, 21))),
        voidedAt,
        voidedBy: voidedAt ? input.ownerUserId : null,
        createdAt: quoteCreatedAt,
        updatedAt: acceptedAt ?? rejectedAt ?? voidedAt ?? sentAt,
      });

      quoteItemRows.push(...lineItems);

      activityRows.push({
        id: id("act"),
        businessId: input.businessId,
        inquiryId,
        quoteId,
        actorUserId: input.ownerUserId,
        type: "quote.created",
        summary: `Quote ${quoteNumberText} created for ${customerName}.`,
        metadata: {
          quoteNumber: quoteNumberText,
          totalInCents: subtotal - discount,
        },
        createdAt: quoteCreatedAt,
        updatedAt: quoteCreatedAt,
      });

      if (quoteStatus === "sent") {
        followUpRows.push({
          id: id("follow"),
          businessId: input.businessId,
          inquiryId,
          quoteId,
          assignedToUserId: input.ownerUserId,
          title: "Follow up on sent quote",
          reason: "The quote is active and waiting for a customer response.",
          category: "sales",
          channel: "email",
          dueAt: daysFromNow(randInt(rng, 1, 5), 14),
          status: "pending",
          createdByUserId: input.ownerUserId,
          createdAt: sentAt,
          updatedAt: sentAt,
        });
      }
    }
  }

  await insertMany(inquiries, inquiryRows);
  await insertMany(quotes, quoteRows);
  await insertMany(quoteItems, quoteItemRows);
  await insertMany(activityLogs, activityRows);
  await insertMany(inquiryNotes, noteRows);
  await insertMany(followUps, followUpRows);
  await insertMany(analyticsEvents, analyticsRows);
  await insertMany(businessNotifications, notificationRows);

  return {
    inquiries: inquiryRows.length,
    quotes: quoteRows.length,
  };
}

function buildQuoteItems(input: {
  businessId: string;
  quoteId: string;
  templates: Array<{ desc: string; min: number; max: number }>;
  rng: () => number;
  createdAt: Date;
}) {
  const rows: Array<typeof quoteItems.$inferInsert> = [];
  const itemCount = randInt(input.rng, 2, Math.min(5, input.templates.length + 1));

  for (let position = 0; position < itemCount; position += 1) {
    const template = input.templates[position % input.templates.length];
    const quantity = randInt(input.rng, 1, 4);
    const unitPriceInCents = randInt(input.rng, template.min, template.max);

    rows.push({
      id: id("item"),
      businessId: input.businessId,
      quoteId: input.quoteId,
      description: template.desc,
      quantity,
      unitPriceInCents,
      lineTotalInCents: quantity * unitPriceInCents,
      position,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    });
  }

  return rows;
}

/**
 * Build job items from quote items
 */
function buildJobItemsFromQuote(
  businessId: string,
  jobId: string,
  quoteItemsData: Array<typeof quoteItems.$inferInsert>,
  createdAt: Date,
): Array<typeof jobItems.$inferInsert> {
  return quoteItemsData.map((quoteItem, position) => ({
    id: id("job_item"),
    businessId,
    jobId,
    description: quoteItem.description,
    quantity: quoteItem.quantity,
    unitPriceInCents: quoteItem.unitPriceInCents,
    lineTotalInCents: quoteItem.lineTotalInCents,
    position,
    createdAt,
    updatedAt: createdAt,
  }));
}

/**
 * Build invoice items from job items or quote items
 */
function buildInvoiceItemsFromJob(
  businessId: string,
  invoiceId: string,
  itemsData: Array<{ description: string; quantity: number; unitPriceInCents: number; lineTotalInCents: number }>,
  createdAt: Date,
): Array<typeof invoiceItems.$inferInsert> {
  return itemsData.map((item, position) => ({
    id: id("inv_item"),
    businessId,
    invoiceId,
    description: item.description,
    quantity: item.quantity,
    unitPriceInCents: item.unitPriceInCents,
    lineTotalInCents: item.lineTotalInCents,
    position,
    createdAt,
    updatedAt: createdAt,
  }));
}

/**
 * Create a job from an accepted quote
 */
async function createJobFromQuote(
  businessId: string,
  quote: typeof quotes.$inferInsert,
  quoteItems: Array<typeof quoteItems.$inferInsert>,
  ownerUserId: string,
  jobStatus: JobStatus,
  position: number,
): Promise<{ job: typeof jobs.$inferInsert; jobItems: Array<typeof jobItems.$inferInsert> }> {
  const jobId = id("job");
  const jobNumber = `JOB-${quote.quoteNumber?.replace("Q-", "") ?? String(position).padStart(4, "0")}`;
  const createdAt = quote.acceptedAt ?? daysAgo(7);

  let startedAt: Date | null = null;
  let completedAt: Date | null = null;

  if (jobStatus === "in_progress" || jobStatus === "done") {
    startedAt = addDays(createdAt, 2);
  }
  if (jobStatus === "done") {
    completedAt = addDays(startedAt ?? createdAt, 5);
  }

  const job: typeof jobs.$inferInsert = {
    id: jobId,
    businessId,
    quoteId: quote.id,
    title: quote.title ?? `Job for ${quote.customerName}`,
    customerName: quote.customerName,
    customerEmail: quote.customerEmail,
    customerContactMethod: quote.customerContactMethod,
    customerContactHandle: quote.customerContactHandle,
    status: jobStatus,
    currency: quote.currency,
    totalInCents: quote.totalInCents,
    notes: `Job created from accepted quote ${quote.quoteNumber}`,
    position,
    startedAt,
    completedAt,
    completedBy: completedAt ? ownerUserId : null,
    createdAt,
    updatedAt: completedAt ?? startedAt ?? createdAt,
  };

  const jobItemsData = buildJobItemsFromJob(businessId, jobId, quoteItems, createdAt);

  return { job, jobItems: jobItemsData };
}

/**
 * Create an invoice from a job or quote
 */
async function createInvoiceFromJob(
  businessId: string,
  job: typeof jobs.$inferInsert,
  jobItems: Array<typeof jobItems.$inferInsert>,
  quote: typeof quotes.$inferInsert,
  ownerUserId: string,
  invoiceStatus: InvoiceStatus,
  invoiceNumber: number,
): Promise<{ invoice: typeof invoices.$inferInsert; invoiceItems: Array<typeof invoiceItems.$inferInsert> }> {
  const invoiceId = id("inv");
  const invoiceNumText = `INV-${String(invoiceNumber).padStart(4, "0")}`;
  const createdAt = job.completedAt ?? job.startedAt ?? job.createdAt ?? daysAgo(5);

  const issuedAt = addDays(createdAt, 1);
  const dueAt = addDays(issuedAt, 14);

  let sentAt: Date | null = null;
  let viewedAt: Date | null = null;
  let paidAt: Date | null = null;
  let voidedAt: Date | null = null;

  if (invoiceStatus !== "draft") {
    sentAt = addDays(issuedAt, 1);
  }
  if (invoiceStatus === "viewed" || invoiceStatus === "paid") {
    viewedAt = addDays(sentAt!, 2);
  }
  if (invoiceStatus === "paid") {
    paidAt = addDays(viewedAt!, 3);
  }
  if (invoiceStatus === "voided") {
    voidedAt = addDays(sentAt ?? issuedAt, 5);
  }

  const invoice: typeof invoices.$inferInsert = {
    id: invoiceId,
    businessId,
    jobId: job.id,
    quoteId: quote.id,
    invoiceNumber: invoiceNumText,
    title: `Invoice for ${job.title}`,
    customerName: job.customerName,
    customerEmail: job.customerEmail,
    customerContactMethod: job.customerContactMethod,
    customerContactHandle: job.customerContactHandle,
    status: invoiceStatus,
    currency: job.currency,
    notes: `Invoice generated from job ${job.id.slice(-6)}`,
    terms: "Payment due within 14 days",
    subtotalInCents: job.totalInCents,
    discountInCents: 0,
    taxInCents: 0,
    totalInCents: job.totalInCents,
    issuedAt,
    dueAt,
    sentAt,
    viewedAt,
    paidAt,
    paidBy: paidAt ? ownerUserId : null,
    voidedAt,
    voidedBy: voidedAt ? ownerUserId : null,
    createdAt,
    updatedAt: paidAt ?? voidedAt ?? viewedAt ?? sentAt ?? issuedAt,
  };

  const invoiceItemsData = buildInvoiceItemsFromJob(
    businessId,
    invoiceId,
    jobItems.map(ji => ({
      description: ji.description,
      quantity: ji.quantity,
      unitPriceInCents: ji.unitPriceInCents,
      lineTotalInCents: ji.lineTotalInCents
    })),
    createdAt
  );

  return { invoice, invoiceItems: invoiceItemsData };
}

/**
 * Seed comprehensive linked data: Inquiry → Quote → Job → Invoice
 * Creates every status combination for proper testing
 */
async function seedLinkedEntityChains(input: {
  businessId: string;
  business: BusinessSeed;
  formId: string;
  ownerUserId: string;
}) {
  const rng = createRng(`${input.business.slug}-linked`);
  const categories = businessTypeCategories[input.business.businessType] ?? businessTypeCategories.general_project_services;
  const itemTemplates = quoteItemTemplates[input.business.businessType] ?? quoteItemTemplates.general_project_services;

  // All inquiry statuses to create
  const inquiryStatuses: InquiryStatus[] = ["new", "waiting", "quoted", "won", "lost", "archived", "overdue"];

  // All quote statuses to create (for quoted/won inquiries)
  const quoteStatuses: QuoteStatus[] = ["draft", "sent", "revision_requested", "accepted", "rejected", "expired", "voided"];

  // All job statuses
  const jobStatuses: JobStatus[] = ["todo", "in_progress", "done"];

  // All invoice statuses
  const invoiceStatuses: InvoiceStatus[] = ["draft", "sent", "viewed", "paid", "overdue", "voided"];

  const inquiryRows: Array<typeof inquiries.$inferInsert> = [];
  const quoteRows: Array<typeof quotes.$inferInsert> = [];
  const quoteItemRows: Array<typeof quoteItems.$inferInsert> = [];
  const jobRows: Array<typeof jobs.$inferInsert> = [];
  const jobItemRows: Array<typeof jobItems.$inferInsert> = [];
  const invoiceRows: Array<typeof invoices.$inferInsert> = [];
  const invoiceItemRows: Array<typeof invoiceItems.$inferInsert> = [];
  const followUpRows: Array<typeof followUps.$inferInsert> = [];
  const checklistRows: Array<typeof postWinChecklistItems.$inferInsert> = [];
  const activityRows: Array<typeof activityLogs.$inferInsert> = [];
  const noteRows: Array<typeof inquiryNotes.$inferInsert> = [];

  let quoteCounter = 1000;
  let invoiceCounter = 1000;

  // Create inquiries for each status
  for (const inquiryStatus of inquiryStatuses) {
    // Create 2 inquiries per status for variety
    for (let i = 0; i < 2; i++) {
      const inquiryId = id("inq");
      const firstName = pick(rng, firstNames);
      const lastName = pick(rng, lastNames);
      const customerName = `${firstName} ${lastName}`;
      const customerEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
      const customerPhone = `+1 415 555 ${randInt(rng, 1000, 9999)}`;
      const contactMethod = chance(rng, 0.6) ? "email" : "phone";
      const contactHandle = contactMethod === "email" ? customerEmail : customerPhone;
      const serviceCategory = pick(rng, categories);
      const submittedAt = daysAgo(randInt(rng, 5, 60), randInt(rng, 8, 18));

      const archivedAt = inquiryStatus === "archived" ? addDays(submittedAt, randInt(rng, 5, 15)) : null;

      inquiryRows.push({
        id: inquiryId,
        businessId: input.businessId,
        businessInquiryFormId: input.formId,
        status: inquiryStatus,
        subject: serviceCategory,
        customerName,
        customerEmail,
        customerContactMethod: contactMethod,
        customerContactHandle: contactHandle,
        serviceCategory,
        requestedDeadline: toDateStr(addDays(submittedAt, randInt(rng, 7, 30))),
        budgetText: `$${randInt(rng, 10, 50) * 100} - $${randInt(rng, 60, 150) * 100}`,
        details: `Looking for ${serviceCategory.toLowerCase()} services. Please provide a detailed quote with timeline.`,
        submittedFieldSnapshot: createSubmittedFieldSnapshot({
          businessType: input.business.businessType,
          customerName,
          contactMethod,
          contactHandle,
          serviceCategory,
          requestedDeadline: toDateStr(addDays(submittedAt, randInt(rng, 7, 30))),
          budgetText: `$${randInt(rng, 10, 50) * 100} - $${randInt(rng, 60, 150) * 100}`,
          details: `Looking for ${serviceCategory.toLowerCase()} services.`,
        }),
        source: "public_form",
        quoteRequested: inquiryStatus !== "archived",
        submittedAt,
        lastRespondedAt: inquiryStatus !== "new" && inquiryStatus !== "archived"
          ? addDays(submittedAt, randInt(rng, 1, 3))
          : null,
        archivedAt,
        archivedBy: archivedAt ? input.ownerUserId : null,
        createdAt: submittedAt,
        updatedAt: archivedAt ?? submittedAt,
      });

      // Add activity log for inquiry
      activityRows.push({
        id: id("act"),
        businessId: input.businessId,
        inquiryId,
        actorUserId: input.ownerUserId,
        type: "inquiry.submitted",
        summary: `${customerName} submitted an inquiry for ${serviceCategory}.`,
        createdAt: submittedAt,
        updatedAt: submittedAt,
      });

      // Add note for some inquiries
      if (chance(rng, 0.3)) {
        noteRows.push({
          id: id("note"),
          businessId: input.businessId,
          inquiryId,
          authorUserId: input.ownerUserId,
          body: "Follow up needed - check if budget aligns with scope.",
          createdAt: addDays(submittedAt, 1),
          updatedAt: addDays(submittedAt, 1),
        });
      }

      // Create quotes for quoted/won/lost inquiries
      if (inquiryStatus === "quoted" || inquiryStatus === "won" || inquiryStatus === "lost") {
        // Create 1-2 quotes per inquiry
        const numQuotes = inquiryStatus === "quoted" ? 2 : 1;

        for (let q = 0; q < numQuotes; q++) {
          const quoteId = id("quote");
          const quoteNum = `Q-${quoteCounter++}`;

          // Determine quote status based on inquiry status
          let quoteStatus: QuoteStatus;
          if (inquiryStatus === "won") {
            quoteStatus = "accepted";
          } else if (inquiryStatus === "lost") {
            quoteStatus = "rejected";
          } else {
            // For quoted inquiries, pick from remaining statuses
            quoteStatus = pick(rng, ["draft", "sent", "revision_requested", "expired", "voided"]);
          }

          const quoteCreatedAt = addDays(submittedAt, randInt(rng, 1, 3));
          const sentAt = quoteStatus !== "draft" ? addDays(quoteCreatedAt, randInt(rng, 0, 2)) : null;
          const acceptedAt = quoteStatus === "accepted" ? addDays(sentAt ?? quoteCreatedAt, randInt(rng, 1, 5)) : null;
          const rejectedAt = quoteStatus === "rejected" ? addDays(sentAt ?? quoteCreatedAt, randInt(rng, 1, 7)) : null;
          const voidedAt = quoteStatus === "voided" ? addDays(sentAt ?? quoteCreatedAt, randInt(rng, 2, 8)) : null;

          const lineItems = buildQuoteItems({
            businessId: input.businessId,
            quoteId,
            templates: itemTemplates,
            rng,
            createdAt: quoteCreatedAt,
          });

          const subtotal = lineItems.reduce((sum, item) => sum + (item.lineTotalInCents ?? 0), 0);
          const discount = chance(rng, 0.2) ? Math.floor(subtotal * 0.1) : 0;
          const total = subtotal - discount;

          const rawToken = `${input.business.slug}-${quoteNum.toLowerCase()}-${randInt(rng, 1000, 9999)}`;

          quoteRows.push({
            id: quoteId,
            businessId: input.businessId,
            inquiryId,
            status: quoteStatus,
            quoteNumber: quoteNum,
            ...tokenFields(rawToken),
            title: `${serviceCategory} Quote`,
            customerName,
            customerEmail,
            customerContactMethod: contactMethod,
            customerContactHandle: contactHandle,
            currency: input.business.defaultCurrency,
            notes: "Quote valid for 14 days from issue date.",
            subtotalInCents: subtotal,
            discountInCents: discount,
            totalInCents: total,
            sentAt,
            acceptedAt,
            rejectedAt,
            voidedAt,
            voidedBy: voidedAt ? input.ownerUserId : null,
            publicViewedAt: sentAt ? addDays(sentAt, randInt(rng, 0, 3)) : null,
            customerRespondedAt: acceptedAt ?? rejectedAt,
            customerResponseMessage: acceptedAt
              ? "Approved! Please proceed with the work."
              : rejectedAt
                ? "Thanks, but we've decided to go with another vendor."
                : null,
            postAcceptanceStatus: acceptedAt ? pick(rng, ["none", "booked", "scheduled"]) : "none",
            validUntil: toDateStr(addDays(sentAt ?? quoteCreatedAt, 14)),
            createdAt: quoteCreatedAt,
            updatedAt: acceptedAt ?? rejectedAt ?? voidedAt ?? sentAt ?? quoteCreatedAt,
          });

          quoteItemRows.push(...lineItems);

          // Activity for quote
          activityRows.push({
            id: id("act"),
            businessId: input.businessId,
            inquiryId,
            quoteId,
            actorUserId: input.ownerUserId,
            type: "quote.created",
            summary: `Quote ${quoteNum} created for ${customerName}.`,
            metadata: { quoteNumber: quoteNum, totalInCents: total },
            createdAt: quoteCreatedAt,
            updatedAt: quoteCreatedAt,
          });

          // Follow-up for sent quotes
          if (quoteStatus === "sent" || quoteStatus === "revision_requested") {
            followUpRows.push({
              id: id("follow"),
              businessId: input.businessId,
              inquiryId,
              quoteId,
              assignedToUserId: input.ownerUserId,
              title: `Follow up on ${quoteStatus === "sent" ? "sent" : "revised"} quote`,
              reason: "Quote is active and awaiting customer response.",
              category: "sales",
              channel: "email",
              dueAt: daysFromNow(randInt(rng, 2, 5)),
              status: "pending",
              createdByUserId: input.ownerUserId,
              createdAt: sentAt ?? quoteCreatedAt,
              updatedAt: sentAt ?? quoteCreatedAt,
            });
          }

          // For accepted quotes, create jobs and potentially invoices
          if (quoteStatus === "accepted" && acceptedAt) {
            // Create post-win checklist
            checklistRows.push(
              {
                id: id("checklist"),
                businessId: input.businessId,
                quoteId,
                label: "Confirm schedule with customer",
                position: 0,
                createdAt: acceptedAt,
                updatedAt: acceptedAt,
              },
              {
                id: id("checklist"),
                businessId: input.businessId,
                quoteId,
                label: "Collect deposit payment",
                position: 1,
                completedAt: chance(rng, 0.5) ? addDays(acceptedAt, 2) : null,
                createdAt: acceptedAt,
                updatedAt: chance(rng, 0.5) ? addDays(acceptedAt, 2) : acceptedAt,
              },
              {
                id: id("checklist"),
                businessId: input.businessId,
                quoteId,
                label: "Order materials / begin work",
                position: 2,
                createdAt: acceptedAt,
                updatedAt: acceptedAt,
              }
            );

            // Create job
            const jobStatus = pick(rng, jobStatuses);
            const jobId = id("job");
            const jobNumber = `JOB-${quoteNum.replace("Q-", "")}`;
            const jobCreatedAt = addDays(acceptedAt, 1);

            let startedAt: Date | null = null;
            let completedAt: Date | null = null;

            if (jobStatus === "in_progress" || jobStatus === "done") {
              startedAt = addDays(jobCreatedAt, 2);
            }
            if (jobStatus === "done") {
              completedAt = addDays(startedAt ?? jobCreatedAt, randInt(rng, 3, 10));
            }

            const job: typeof jobs.$inferInsert = {
              id: jobId,
              businessId: input.businessId,
              quoteId,
              title: `${serviceCategory} - ${customerName}`,
              customerName,
              customerEmail,
              customerContactMethod: contactMethod,
              customerContactHandle: contactHandle,
              status: jobStatus,
              currency: input.business.defaultCurrency,
              totalInCents: total,
              notes: `Job created from accepted quote ${quoteNum}`,
              position: jobRows.length,
              startedAt,
              completedAt,
              completedBy: completedAt ? input.ownerUserId : null,
              createdAt: jobCreatedAt,
              updatedAt: completedAt ?? startedAt ?? jobCreatedAt,
            };

            jobRows.push(job);

            // Create job items from quote items
            const jItems = lineItems.map((qi, pos) => ({
              id: id("job_item"),
              businessId: input.businessId,
              jobId,
              description: qi.description,
              quantity: qi.quantity,
              unitPriceInCents: qi.unitPriceInCents,
              lineTotalInCents: qi.lineTotalInCents,
              position: pos,
              completedAt: jobStatus === "done" ? addDays(startedAt ?? jobCreatedAt, randInt(rng, 1, 5)) : null,
              createdAt: jobCreatedAt,
              updatedAt: jobCreatedAt,
            }));

            jobItemRows.push(...jItems);

            // Activity for job
            activityRows.push({
              id: id("act"),
              businessId: input.businessId,
              quoteId,
              actorUserId: input.ownerUserId,
              type: "job.created",
              summary: `Job ${jobNumber} created from accepted quote ${quoteNum}.`,
              metadata: { jobId, quoteNumber: quoteNum },
              createdAt: jobCreatedAt,
              updatedAt: jobCreatedAt,
            });

            // For done jobs, create invoice
            if (jobStatus === "done" && completedAt) {
              const invStatus = pick(rng, invoiceStatuses);
              const invId = id("inv");
              const invNum = `INV-${invoiceCounter++}`;
              const invCreatedAt = addDays(completedAt, 1);
              const issuedAt = addDays(invCreatedAt, 1);
              const dueAt = addDays(issuedAt, 14);

              let invSentAt: Date | null = null;
              let invViewedAt: Date | null = null;
              let invPaidAt: Date | null = null;
              let invVoidedAt: Date | null = null;

              if (invStatus !== "draft") {
                invSentAt = addDays(issuedAt, 1);
              }
              if (invStatus === "viewed" || invStatus === "paid") {
                invViewedAt = addDays(invSentAt!, randInt(rng, 1, 3));
              }
              if (invStatus === "paid") {
                invPaidAt = addDays(invViewedAt!, randInt(rng, 1, 5));
              }
              if (invStatus === "voided") {
                invVoidedAt = addDays(invSentAt ?? issuedAt, randInt(rng, 3, 10));
              }

              invoiceRows.push({
                id: invId,
                businessId: input.businessId,
                jobId,
                quoteId,
                invoiceNumber: invNum,
                title: `Invoice for ${serviceCategory}`,
                customerName,
                customerEmail,
                customerContactMethod: contactMethod,
                customerContactHandle: contactHandle,
                status: invStatus,
                currency: input.business.defaultCurrency,
                notes: `Payment for completed job ${jobNumber}`,
                terms: "Net 14 days",
                subtotalInCents: total,
                discountInCents: 0,
                taxInCents: 0,
                totalInCents: total,
                issuedAt,
                dueAt,
                sentAt: invSentAt,
                viewedAt: invViewedAt,
                paidAt: invPaidAt,
                paidBy: invPaidAt ? input.ownerUserId : null,
                voidedAt: invVoidedAt,
                voidedBy: invVoidedAt ? input.ownerUserId : null,
                createdAt: invCreatedAt,
                updatedAt: invPaidAt ?? invVoidedAt ?? invViewedAt ?? invSentAt ?? issuedAt,
              });

              // Invoice items
              const invItems = jItems.map((ji, pos) => ({
                id: id("inv_item"),
                businessId: input.businessId,
                invoiceId: invId,
                description: ji.description,
                quantity: ji.quantity,
                unitPriceInCents: ji.unitPriceInCents,
                lineTotalInCents: ji.lineTotalInCents,
                position: pos,
                createdAt: invCreatedAt,
                updatedAt: invCreatedAt,
              }));

              invoiceItemRows.push(...invItems);

              // Activity for invoice
              activityRows.push({
                id: id("act"),
                businessId: input.businessId,
                jobId,
                quoteId,
                actorUserId: input.ownerUserId,
                type: "invoice.created",
                summary: `Invoice ${invNum} created for completed job.`,
                metadata: { invoiceNumber: invNum, amount: total },
                createdAt: invCreatedAt,
                updatedAt: invCreatedAt,
              });
            }
          }
        }
      }
    }
  }

  // Insert all data
  await insertMany(inquiries, inquiryRows);
  await insertMany(quotes, quoteRows);
  await insertMany(quoteItems, quoteItemRows);
  await insertMany(jobs, jobRows);
  await insertMany(jobItems, jobItemRows);
  await insertMany(invoices, invoiceRows);
  await insertMany(invoiceItems, invoiceItemRows);
  await insertMany(followUps, followUpRows);
  await insertMany(postWinChecklistItems, checklistRows);
  await insertMany(activityLogs, activityRows);
  await insertMany(inquiryNotes, noteRows);

  console.log(`    Linked entities created:`);
  console.log(`      - ${inquiryRows.length} inquiries (all statuses)`);
  console.log(`      - ${quoteRows.length} quotes (all statuses)`);
  console.log(`      - ${jobRows.length} jobs (all statuses)`);
  console.log(`      - ${invoiceRows.length} invoices (all statuses)`);

  return {
    inquiries: inquiryRows.length,
    quotes: quoteRows.length,
    jobs: jobRows.length,
    invoices: invoiceRows.length,
  };
}

async function insertMany<T extends { $inferInsert: unknown }>(
  table: T,
  rows: Array<T["$inferInsert"]>,
) {
  const batchSize = 100;

  for (let index = 0; index < rows.length; index += batchSize) {
    await db.insert(table as never).values(rows.slice(index, index + batchSize) as never);
  }
}

async function seedStableSmokeFixtures(input: {
  businessId: string;
  formId: string;
  ownerUserId: string;
}) {
  const demoInquiryId = "demo_inquiry_quoted_booth_kit";
  const storefrontInquiryId = "demo_inquiry_new_storefront";
  const archivedInquiryId = "demo_inquiry_archived_showroom_refresh";
  const historyQuoteId = "demo_quote_history_0998";
  const sentQuoteId = "demo_quote_sent_1002";
  const acceptedQuoteId = "demo_quote_accepted_1003";
  const expiredQuoteId = "demo_quote_expired_1005";
  const voidedQuoteId = "demo_quote_voided_1006";
  const contactMethod = "phone";
  const contactHandle = "+1 415 555 0199";

  await db.insert(inquiries).values([
    {
      id: demoInquiryId,
      businessId: input.businessId,
      businessInquiryFormId: input.formId,
      status: "quoted",
      subject: "Foundry Labs booth kit",
      customerName: "Taylor Nguyen",
      customerEmail: "taylor@example.com",
      customerContactMethod: contactMethod,
      customerContactHandle: contactHandle,
      serviceCategory: "Event signage",
      requestedDeadline: toDateStr(daysFromNow(21)),
      budgetText: "$2,000 - $3,000",
      details:
        "Need modular booth graphics, a counter wrap, and two directional signs for an upcoming expo. The customer still needs to confirm event date, number of guests, preferred package, and delivery deadline.",
      submittedFieldSnapshot: createSubmittedFieldSnapshot({
        businessType: "print_signage",
        customerName: "Taylor Nguyen",
        contactMethod,
        contactHandle,
        serviceCategory: "Event signage",
        requestedDeadline: toDateStr(daysFromNow(21)),
        budgetText: "$2,000 - $3,000",
        details:
          "Need modular booth graphics, a counter wrap, and two directional signs for an upcoming expo.",
        extras: [
          {
            id: "missing-info",
            label: "Missing info",
            value: "Exact event date, number of guests, preferred package, delivery deadline",
          },
        ],
      }),
      source: "public_form",
      quoteRequested: true,
      submittedAt: daysAgo(5),
      lastRespondedAt: daysAgo(3),
      createdAt: daysAgo(5),
      updatedAt: daysAgo(3),
    },
    {
      id: storefrontInquiryId,
      businessId: input.businessId,
      businessInquiryFormId: input.formId,
      status: "waiting",
      subject: "Foundry Labs storefront rebrand",
      customerName: "Taylor Nguyen",
      customerEmail: "taylor@example.com",
      customerContactMethod: contactMethod,
      customerContactHandle: contactHandle,
      serviceCategory: "Office signage",
      requestedDeadline: toDateStr(daysFromNow(35)),
      budgetText: "$4,000 - $6,000",
      details:
        "Need exterior lettering, lobby signage, and directional panels for a storefront rollout.",
      submittedFieldSnapshot: createSubmittedFieldSnapshot({
        businessType: "print_signage",
        customerName: "Taylor Nguyen",
        contactMethod,
        contactHandle,
        serviceCategory: "Office signage",
        requestedDeadline: toDateStr(daysFromNow(35)),
        budgetText: "$4,000 - $6,000",
        details:
          "Need exterior lettering, lobby signage, and directional panels for a storefront rollout.",
      }),
      source: "public_form",
      quoteRequested: true,
      submittedAt: daysAgo(21),
      lastRespondedAt: daysAgo(18),
      createdAt: daysAgo(21),
      updatedAt: daysAgo(18),
    },
    {
      id: archivedInquiryId,
      businessId: input.businessId,
      businessInquiryFormId: input.formId,
      status: "waiting",
      subject: "Showroom graphics refresh",
      customerName: "Jordan Silva",
      customerEmail: "jordan.silva@example.com",
      customerContactMethod: "phone",
      customerContactHandle: "+1 415 555 0147",
      serviceCategory: "Showroom refresh",
      requestedDeadline: toDateStr(daysFromNow(45)),
      budgetText: "$1,500 - $2,500",
      details:
        "Seasonal showroom update request kept for reference after the customer paused pricing.",
      submittedFieldSnapshot: createSubmittedFieldSnapshot({
        businessType: "print_signage",
        customerName: "Jordan Silva",
        contactMethod: "phone",
        contactHandle: "+1 415 555 0147",
        serviceCategory: "Showroom refresh",
        requestedDeadline: toDateStr(daysFromNow(45)),
        budgetText: "$1,500 - $2,500",
        details:
          "Seasonal showroom update request kept for reference after the customer paused pricing.",
      }),
      source: "public_form",
      quoteRequested: false,
      submittedAt: daysAgo(14),
      archivedAt: daysAgo(6),
      archivedBy: input.ownerUserId,
      createdAt: daysAgo(14),
      updatedAt: daysAgo(6),
    },
  ]);

  await db.insert(quotes).values([
    {
      id: historyQuoteId,
      businessId: input.businessId,
      inquiryId: storefrontInquiryId,
      status: "accepted",
      quoteNumber: "Q-SMOKE-0998",
      ...tokenFields("smoke-history-0998-token"),
      title: "Foundry Labs rebrand signage package",
      customerName: "Taylor Nguyen",
      customerEmail: "taylor@example.com",
      customerContactMethod: contactMethod,
      customerContactHandle: contactHandle,
      currency: "USD",
      notes: "Older accepted quote kept in customer history for smoke coverage.",
      subtotalInCents: 180000,
      discountInCents: 5000,
      totalInCents: 175000,
      sentAt: daysAgo(18),
      acceptedAt: daysAgo(16),
      publicViewedAt: daysAgo(17),
      customerRespondedAt: daysAgo(16),
      customerResponseMessage: "Approved. Please move ahead with the rollout.",
      postAcceptanceStatus: "scheduled",
      validUntil: toDateStr(daysAgo(3)),
      createdAt: daysAgo(19),
      updatedAt: daysAgo(16),
    },
    {
      id: sentQuoteId,
      businessId: input.businessId,
      inquiryId: demoInquiryId,
      status: "sent",
      quoteNumber: "Q-SMOKE-1002",
      ...tokenFields(publicQuoteToken),
      title: "Foundry Labs booth kit",
      customerName: "Taylor Nguyen",
      customerEmail: "taylor@example.com",
      customerContactMethod: contactMethod,
      customerContactHandle: contactHandle,
      currency: "USD",
      notes:
        "Production starts after approval. Delivery is included in the quoted total.",
      subtotalInCents: 245000,
      discountInCents: 15000,
      totalInCents: 230000,
      sentAt: daysAgo(2),
      publicViewedAt: daysAgo(1),
      validUntil: toDateStr(daysFromNow(5)),
      createdAt: daysAgo(4),
      updatedAt: daysAgo(2),
    },
    {
      id: acceptedQuoteId,
      businessId: input.businessId,
      inquiryId: null,
      status: "accepted",
      quoteNumber: "Q-SMOKE-1003",
      ...tokenFields("smoke-accepted-1003-token"),
      title: "Luma Coffee counter signage package",
      customerName: "Alex Morgan",
      customerEmail: "alex.morgan@example.com",
      customerContactMethod: "email",
      customerContactHandle: "alex.morgan@example.com",
      currency: "USD",
      notes: "Accepted quote fixture for post-acceptance smoke coverage.",
      subtotalInCents: 96000,
      discountInCents: 6000,
      totalInCents: 90000,
      sentAt: daysAgo(9),
      acceptedAt: daysAgo(7),
      publicViewedAt: daysAgo(8),
      customerRespondedAt: daysAgo(7),
      customerResponseMessage: "Looks good. Please schedule the install.",
      postAcceptanceStatus: "none",
      validUntil: toDateStr(daysFromNow(10)),
      createdAt: daysAgo(10),
      updatedAt: daysAgo(7),
    },
    {
      id: expiredQuoteId,
      businessId: input.businessId,
      inquiryId: demoInquiryId,
      status: "expired",
      quoteNumber: "Q-SMOKE-1005",
      ...tokenFields(expiredQuoteToken),
      title: "Foundry Labs booth kit refresh",
      customerName: "Taylor Nguyen",
      customerEmail: "taylor@example.com",
      customerContactMethod: contactMethod,
      customerContactHandle: contactHandle,
      currency: "USD",
      notes: "Expired quote fixture for public testing.",
      subtotalInCents: 120000,
      discountInCents: 0,
      totalInCents: 120000,
      sentAt: daysAgo(25),
      publicViewedAt: daysAgo(24),
      validUntil: toDateStr(daysAgo(2)),
      createdAt: daysAgo(30),
      updatedAt: daysAgo(20),
    },
    {
      id: voidedQuoteId,
      businessId: input.businessId,
      inquiryId: null,
      status: "voided",
      quoteNumber: "Q-SMOKE-1006",
      ...tokenFields(voidedQuoteToken),
      title: "Elm Street wayfinding package",
      customerName: "Jamie Park",
      customerEmail: "jamie.park@example.com",
      customerContactMethod: "email",
      customerContactHandle: "jamie.park@example.com",
      currency: "USD",
      notes: "Voided quote fixture kept for lifecycle and reporting coverage.",
      subtotalInCents: 110000,
      discountInCents: 0,
      totalInCents: 110000,
      sentAt: daysAgo(8),
      publicViewedAt: daysAgo(7),
      validUntil: toDateStr(daysFromNow(7)),
      voidedAt: daysAgo(5),
      voidedBy: input.ownerUserId,
      createdAt: daysAgo(10),
      updatedAt: daysAgo(5),
    },
  ]);

  await db.insert(quoteItems).values([
    {
      id: id("item"),
      businessId: input.businessId,
      quoteId: historyQuoteId,
      description: "Storefront lettering set",
      quantity: 1,
      unitPriceInCents: 95000,
      lineTotalInCents: 95000,
      position: 0,
      createdAt: daysAgo(19),
      updatedAt: daysAgo(19),
    },
    {
      id: id("item"),
      businessId: input.businessId,
      quoteId: historyQuoteId,
      description: "Lobby directional sign pack",
      quantity: 2,
      unitPriceInCents: 42500,
      lineTotalInCents: 85000,
      position: 1,
      createdAt: daysAgo(19),
      updatedAt: daysAgo(19),
    },
    {
      id: id("item"),
      businessId: input.businessId,
      quoteId: sentQuoteId,
      description: "Booth backdrop graphic panels",
      quantity: 2,
      unitPriceInCents: 85000,
      lineTotalInCents: 170000,
      position: 0,
      createdAt: daysAgo(4),
      updatedAt: daysAgo(4),
    },
    {
      id: id("item"),
      businessId: input.businessId,
      quoteId: sentQuoteId,
      description: "Counter wrap and installation",
      quantity: 1,
      unitPriceInCents: 75000,
      lineTotalInCents: 75000,
      position: 1,
      createdAt: daysAgo(4),
      updatedAt: daysAgo(4),
    },
    {
      id: id("item"),
      businessId: input.businessId,
      quoteId: acceptedQuoteId,
      description: "Counter fascia signage",
      quantity: 1,
      unitPriceInCents: 42000,
      lineTotalInCents: 42000,
      position: 0,
      createdAt: daysAgo(10),
      updatedAt: daysAgo(10),
    },
    {
      id: id("item"),
      businessId: input.businessId,
      quoteId: acceptedQuoteId,
      description: "Window hours decals",
      quantity: 4,
      unitPriceInCents: 13500,
      lineTotalInCents: 54000,
      position: 1,
      createdAt: daysAgo(10),
      updatedAt: daysAgo(10),
    },
    {
      id: id("item"),
      businessId: input.businessId,
      quoteId: expiredQuoteId,
      description: "Refresh signage package",
      quantity: 1,
      unitPriceInCents: 120000,
      lineTotalInCents: 120000,
      position: 0,
      createdAt: daysAgo(30),
      updatedAt: daysAgo(30),
    },
    {
      id: id("item"),
      businessId: input.businessId,
      quoteId: voidedQuoteId,
      description: "Wayfinding sign family",
      quantity: 5,
      unitPriceInCents: 22000,
      lineTotalInCents: 110000,
      position: 0,
      createdAt: daysAgo(10),
      updatedAt: daysAgo(10),
    },
  ]);

  await db.insert(inquiryNotes).values([
    {
      id: id("note"),
      businessId: input.businessId,
      inquiryId: demoInquiryId,
      authorUserId: input.ownerUserId,
      body:
        "AI should ask for exact event date, guest count, preferred package, and delivery deadline before final pricing.",
      createdAt: daysAgo(4),
      updatedAt: daysAgo(4),
    },
    {
      id: id("note"),
      businessId: input.businessId,
      inquiryId: storefrontInquiryId,
      authorUserId: input.ownerUserId,
      body: "Customer is likely to approve once storefront install timing is confirmed.",
      createdAt: daysAgo(18),
      updatedAt: daysAgo(18),
    },
  ]);

  await db.insert(followUps).values([
    {
      id: "demo_followup_sent_quote_1002",
      businessId: input.businessId,
      inquiryId: demoInquiryId,
      quoteId: sentQuoteId,
      assignedToUserId: input.ownerUserId,
      title: "Follow up on viewed quote",
      reason:
        "The customer viewed this quote but has not accepted or rejected it. Schedule the next customer touchpoint.",
      category: "sales",
      channel: "email",
      dueAt: todayAtUtc(15),
      status: "pending",
      createdByUserId: input.ownerUserId,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
    {
      id: id("follow"),
      businessId: input.businessId,
      inquiryId: storefrontInquiryId,
      assignedToUserId: input.ownerUserId,
      title: "Confirm storefront install timing",
      reason: "Customer history suggests the same buyer is planning a larger signage rollout.",
      category: "sales",
      channel: "phone",
      dueAt: daysFromNow(1, 16),
      status: "pending",
      createdByUserId: input.ownerUserId,
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
    },
  ]);

  await db.insert(postWinChecklistItems).values([
    {
      id: id("post_win"),
      businessId: input.businessId,
      quoteId: acceptedQuoteId,
      label: "Confirm installation date",
      position: 0,
      createdAt: daysAgo(7),
      updatedAt: daysAgo(7),
    },
    {
      id: id("post_win"),
      businessId: input.businessId,
      quoteId: acceptedQuoteId,
      label: "Collect deposit",
      completedAt: daysAgo(6),
      position: 1,
      createdAt: daysAgo(7),
      updatedAt: daysAgo(6),
    },
    {
      id: id("post_win"),
      businessId: input.businessId,
      quoteId: acceptedQuoteId,
      label: "Send production proof",
      position: 2,
      createdAt: daysAgo(7),
      updatedAt: daysAgo(7),
    },
  ]);

  await db.insert(activityLogs).values([
    {
      id: id("act"),
      businessId: input.businessId,
      inquiryId: demoInquiryId,
      quoteId: sentQuoteId,
      actorUserId: input.ownerUserId,
      type: "quote.created",
      summary: "Quote Q-SMOKE-1002 created for Taylor Nguyen.",
      metadata: { quoteNumber: "Q-SMOKE-1002" },
      createdAt: daysAgo(4),
      updatedAt: daysAgo(4),
    },
    {
      id: id("act"),
      businessId: input.businessId,
      inquiryId: demoInquiryId,
      quoteId: sentQuoteId,
      actorUserId: input.ownerUserId,
      type: "quote.sent",
      summary: "Quote Q-SMOKE-1002 sent to Taylor Nguyen.",
      metadata: { quoteNumber: "Q-SMOKE-1002" },
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
    },
    {
      id: id("act"),
      businessId: input.businessId,
      inquiryId: archivedInquiryId,
      actorUserId: input.ownerUserId,
      type: "inquiry.archived",
      summary: "Request archived after the customer paused the showroom refresh.",
      metadata: {},
      createdAt: daysAgo(6),
      updatedAt: daysAgo(6),
    },
    {
      id: id("act"),
      businessId: input.businessId,
      quoteId: voidedQuoteId,
      actorUserId: input.ownerUserId,
      type: "quote.voided",
      summary: "Quote Q-SMOKE-1006 voided after the scope changed.",
      metadata: { quoteNumber: "Q-SMOKE-1006" },
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
    },
    {
      id: id("act"),
      businessId: input.businessId,
      quoteId: acceptedQuoteId,
      actorUserId: null,
      type: "quote.accepted",
      summary: "Alex Morgan accepted quote Q-SMOKE-1003.",
      metadata: { quoteNumber: "Q-SMOKE-1003" },
      createdAt: daysAgo(7),
      updatedAt: daysAgo(7),
    },
  ]);

  await seedStableAnalyticsAndNotifications({
    businessId: input.businessId,
    formId: input.formId,
    ownerUserId: input.ownerUserId,
    demoInquiryId,
    sentQuoteId,
    acceptedQuoteId,
    expiredQuoteId,
    voidedQuoteId,
  });

  await seedStableAiFixtures({
    businessId: input.businessId,
    ownerUserId: input.ownerUserId,
    inquiryId: demoInquiryId,
    quoteId: sentQuoteId,
  });
}

async function seedStableAnalyticsAndNotifications(input: {
  businessId: string;
  formId: string;
  ownerUserId: string;
  demoInquiryId: string;
  sentQuoteId: string;
  acceptedQuoteId: string;
  expiredQuoteId: string;
  voidedQuoteId: string;
}) {
  await db.insert(analyticsEvents).values([
    {
      id: id("analytics"),
      businessId: input.businessId,
      businessInquiryFormId: input.formId,
      eventType: "inquiry_form_viewed",
      visitorHash: hashOpaqueToken("stable-form-view-1"),
      occurredAt: daysAgo(5),
    },
    {
      id: id("analytics"),
      businessId: input.businessId,
      quoteId: input.sentQuoteId,
      eventType: "quote_public_viewed",
      visitorHash: hashOpaqueToken("stable-quote-view-1002"),
      occurredAt: daysAgo(1),
    },
    {
      id: id("analytics"),
      businessId: input.businessId,
      quoteId: input.expiredQuoteId,
      eventType: "quote_public_viewed",
      visitorHash: hashOpaqueToken("stable-quote-view-1005"),
      occurredAt: daysAgo(24),
    },
    {
      id: id("analytics"),
      businessId: input.businessId,
      quoteId: input.voidedQuoteId,
      eventType: "quote_public_viewed",
      visitorHash: hashOpaqueToken("stable-quote-view-1006"),
      occurredAt: daysAgo(7),
    },
  ]);

  const inquiryNotificationId = id("notification");
  const acceptedNotificationId = id("notification");

  await db.insert(businessNotifications).values([
    {
      id: inquiryNotificationId,
      businessId: input.businessId,
      inquiryId: input.demoInquiryId,
      type: "public_inquiry_submitted",
      title: "New inquiry received",
      summary: "Taylor Nguyen submitted an event signage inquiry.",
      metadata: { source: "public_form" },
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
    },
    {
      id: acceptedNotificationId,
      businessId: input.businessId,
      quoteId: input.acceptedQuoteId,
      type: "quote_customer_accepted",
      title: "Quote accepted",
      summary: "Alex Morgan accepted Q-SMOKE-1003.",
      metadata: { quoteNumber: "Q-SMOKE-1003" },
      createdAt: daysAgo(7),
      updatedAt: daysAgo(7),
    },
  ]);

  await db.insert(businessNotificationStates).values({
    id: id("notification_state"),
    businessId: input.businessId,
    userId: input.ownerUserId,
    lastReadAt: daysAgo(8),
    createdAt: daysAgo(8),
    updatedAt: daysAgo(8),
  });

  await db.insert(businessNotificationReads).values({
    id: id("notification_read"),
    businessId: input.businessId,
    notificationId: acceptedNotificationId,
    userId: input.ownerUserId,
    readAt: daysAgo(6),
    createdAt: daysAgo(6),
    updatedAt: daysAgo(6),
  });

  const outboxId = id("email");

  await db.insert(emailOutbox).values({
    id: outboxId,
    businessId: input.businessId,
    userId: input.ownerUserId,
    type: "quote",
    to: ["taylor@example.com"],
    from: "quotes@test.requo.app",
    subject: "Your quote from BrightSide Print Studio",
    html: "<p>Your quote is ready for review.</p>",
    textBody: "Your quote is ready for review.",
    status: "sent",
    idempotencyKey: "demo:quote:Q-SMOKE-1002",
    provider: "resend",
    providerMessageId: "demo_resend_quote_1002",
    attempts: 1,
    metadata: {
      quoteId: input.sentQuoteId,
      quoteNumber: "Q-SMOKE-1002",
    },
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
    sentAt: daysAgo(2),
  });

  await db.insert(emailAttempts).values({
    id: id("email_attempt"),
    emailOutboxId: outboxId,
    provider: "resend",
    status: "success",
    providerMessageId: "demo_resend_quote_1002",
    createdAt: daysAgo(2),
  });

  await db.insert(auditLogs).values([
    {
      id: id("audit"),
      businessId: input.businessId,
      actorUserId: input.ownerUserId,
      entityType: "inquiry",
      entityId: input.demoInquiryId,
      action: "inquiry.reviewed",
      metadata: { source: "seed" },
      source: "seed",
      createdAt: daysAgo(4),
    },
    {
      id: id("audit"),
      businessId: input.businessId,
      actorUserId: input.ownerUserId,
      entityType: "quote",
      entityId: input.voidedQuoteId,
      action: "quote.voided",
      metadata: { quoteNumber: "Q-SMOKE-1006" },
      source: "seed",
      createdAt: daysAgo(5),
    },
  ]);
}

async function seedStableAiFixtures(input: {
  businessId: string;
  ownerUserId: string;
  inquiryId: string;
  quoteId: string;
}) {
  const conversationId = "demo_ai_conversation_missing_info";
  const dashboardConversationId = id("ai_conversation");
  const answerMarkdown = [
    "Missing:",
    "- exact event date",
    "- number of guests",
    "- preferred package",
    "- delivery deadline",
    "",
    "Suggested reply:",
    "",
    "Hi! Thanks for your inquiry. Before I send the final quote, may I confirm the event date and number of guests?",
    "",
    "Sources:",
    `- [Foundry Labs booth kit](/${primaryBusinessSlug}/inquiries/${input.inquiryId})`,
    `- [Q-SMOKE-1002](/${primaryBusinessSlug}/quotes/${input.quoteId})`,
  ].join("\n");

  await db.insert(aiConversations).values([
    {
      id: conversationId,
      userId: input.ownerUserId,
      businessId: input.businessId,
      surface: "inquiry",
      entityId: input.inquiryId,
      title: "Missing quote details",
      isDefault: true,
      lastMessageAt: daysAgo(1),
      createdAt: daysAgo(2),
      updatedAt: daysAgo(1),
    },
    {
      id: dashboardConversationId,
      userId: input.ownerUserId,
      businessId: input.businessId,
      surface: "dashboard",
      entityId: input.businessId,
      title: "Today in BrightSide",
      isDefault: false,
      lastMessageAt: daysAgo(1, 10),
      createdAt: daysAgo(3),
      updatedAt: daysAgo(1, 10),
    },
  ]);

  await db.insert(aiMessages).values([
    {
      id: id("ai_message"),
      conversationId,
      role: "user",
      content: "Review this inquiry before I send the quote.",
      status: "completed",
      metadata: { source: "seed" },
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
    },
    {
      id: id("ai_message"),
      conversationId,
      role: "assistant",
      content: answerMarkdown,
      provider: "openrouter",
      model: "openrouter/auto",
      status: "completed",
      metadata: {
        format: "markdown",
        sources: [
          `/${primaryBusinessSlug}/inquiries/${input.inquiryId}`,
          `/${primaryBusinessSlug}/quotes/${input.quoteId}`,
        ],
      },
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
    {
      id: id("ai_message"),
      conversationId: dashboardConversationId,
      role: "assistant",
      content:
        "You have one viewed quote to follow up today and one accepted job waiting for schedule confirmation.",
      provider: "openrouter",
      model: "openrouter/auto",
      status: "completed",
      metadata: { format: "markdown" },
      createdAt: daysAgo(1, 10),
      updatedAt: daysAgo(1, 10),
    },
  ]);

  await db.insert(aiDrafts).values({
    id: id("ai_draft"),
    businessId: input.businessId,
    userId: input.ownerUserId,
    entityId: input.inquiryId,
    entityType: "inquiry",
    taskType: "missing_info_detection",
    content: {
      markdown: answerMarkdown,
      missingFields: [
        "exact event date",
        "number of guests",
        "preferred package",
        "delivery deadline",
      ],
    },
    sourceDataTimestamp: daysAgo(1),
    isStale: false,
    lastAccessedAt: daysAgo(1),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  });

  await db.insert(aiUsageEvents).values({
    id: id("ai_usage"),
    userId: input.ownerUserId,
    businessId: input.businessId,
    taskType: "missing_info_detection",
    weight: 1,
    createdAt: daysAgo(1),
  });

  await db.insert(aiTokenLogs).values({
    id: id("ai_token"),
    userId: input.ownerUserId,
    businessId: input.businessId,
    taskType: "missing_info_detection",
    model: "openrouter/auto",
    provider: "openrouter",
    inputTokens: 560,
    outputTokens: 180,
    totalTokens: 740,
    estimatedCostCents: 1,
    cacheHit: false,
    latencyMs: 1320,
    status: "success",
    unpriced: false,
    createdAt: daysAgo(1),
  });

  await db.insert(inquiryMessages).values([
    {
      id: id("inquiry_message"),
      inquiryId: input.inquiryId,
      role: "user",
      content: "What is missing before a final quote?",
      status: "completed",
      metadata: { source: "seed" },
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
    },
    {
      id: id("inquiry_message"),
      inquiryId: input.inquiryId,
      role: "assistant",
      content: answerMarkdown,
      provider: "openrouter",
      model: "openrouter/auto",
      status: "completed",
      metadata: { format: "markdown" },
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
  ]);
}

async function main() {
  console.log("");
  console.log("Requo Demo Seeder");
  console.log("==================");
  console.log("Creates fully linked data: Inquiry → Quote → Job → Invoice");
  console.log("Includes all status combinations for comprehensive testing");
  console.log("");

  await resetDatabase();

  const summary: Array<{
    email: string;
    plan: BusinessPlan;
    isAdmin: boolean;
    businesses: Array<{
      name: string;
      slug: string;
      inquiries: number;
      quotes: number;
      jobs: number;
      invoices: number;
    }>;
  }> = [];
  let primaryBusiness: CreatedBusiness | null = null;
  let primaryOwnerUserId: string | null = null;

  for (const account of seedAccounts) {
    const isAdmin = account.email === "marklouie.dev@gmail.com";
    console.log(`Seeding ${account.plan}${isAdmin ? " (admin)" : ""} account: ${account.email}`);

    const ownerUserId = await ensureUserAccount({
      name: account.name,
      email: account.email,
      password: account.password,
    });

    const businessSummaries: (typeof summary)[number]["businesses"] = [];

    for (const business of account.businesses) {
      console.log(`  Creating business: ${business.name}`);

      const createdBusiness = await createBusiness(account, business, ownerUserId);

      await seedBusinessBilling(
        createdBusiness.businessId,
        business.slug,
        account.plan,
      );

      if (account.teamMembers?.length) {
        await addTeamMembersToBusiness({
          businessId: createdBusiness.businessId,
          teamMembers: account.teamMembers,
        });
      }

      // Use the new comprehensive linked entity seeder
      const linkedCounts = await seedLinkedEntityChains({
        business,
        businessId: createdBusiness.businessId,
        formId: createdBusiness.formId,
        ownerUserId,
      });

      const isPrimaryBusiness = business.slug === primaryBusinessSlug;

      if (isPrimaryBusiness) {
        await seedStableSmokeFixtures({
          businessId: createdBusiness.businessId,
          formId: createdBusiness.formId,
          ownerUserId,
        });
        await seedPendingInvite({
          businessId: createdBusiness.businessId,
          inviterUserId: ownerUserId,
        });

        primaryBusiness = createdBusiness;
        primaryOwnerUserId = ownerUserId;
      }

      businessSummaries.push({
        name: business.name,
        slug: business.slug,
        inquiries: linkedCounts.inquiries,
        quotes: linkedCounts.quotes,
        jobs: linkedCounts.jobs,
        invoices: linkedCounts.invoices,
      });
    }

    summary.push({
      email: account.email,
      plan: account.plan,
      isAdmin,
      businesses: businessSummaries,
    });
  }

  await ensureUserAccount({
    name: "Casey Walker",
    email: outsiderEmail,
    password: outsiderPassword,
  });

  if (!primaryBusiness || !primaryOwnerUserId) {
    throw new Error(`Primary demo business was not seeded: ${primaryBusinessSlug}`);
  }

  console.log("");
  console.log("Demo Seed Complete");
  console.log("==================");
  console.log(`Default owner: ${ownerEmail}`);
  console.log(`Default password: ${ownerPassword}`);
  console.log(`Manager: ${managerEmail}`);
  console.log(`Staff: ${staffEmail}`);
  console.log(`Pending invite: ${pendingInviteEmail}`);
  console.log(`Pending invite token: ${pendingInviteToken}`);
  console.log(`Outsider: ${outsiderEmail}`);
  console.log("");
  console.log("Admin User: marklouie.dev@gmail.com (role: admin)");
  console.log("");

  for (const account of summary) {
    const adminBadge = account.isAdmin ? " [ADMIN]" : "";
    console.log(`[${account.plan.toUpperCase()}${adminBadge}] ${account.email}`);

    for (const business of account.businesses) {
      const dashboardUrl = new URL(
        `/${business.slug}/home`,
        env.BETTER_AUTH_URL,
      ).toString();

      console.log(`  ${business.name} (${business.slug}):`);
      console.log(`    ${business.inquiries} inquiries | ${business.quotes} quotes | ${business.jobs} jobs | ${business.invoices} invoices`);
      console.log(`    Dashboard: ${dashboardUrl}`);
    }
  }

  console.log("");
  console.log("Status Coverage:");
  console.log("  Inquiries: new, waiting, quoted, won, lost, archived, overdue");
  console.log("  Quotes: draft, sent, revision_requested, accepted, rejected, expired, voided");
  console.log("  Jobs: todo, in_progress, done");
  console.log("  Invoices: draft, sent, viewed, paid, overdue, voided");
  console.log("");
}

main()
  .catch((error) => {
    console.error("Failed to seed demo data.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await dbConnection.end({ timeout: 5 });
  });
