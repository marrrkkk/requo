/**
 * scripts/seed-demo.ts
 *
 * Complete dev/demo database seeder for Requo.
 *
 * Creates 3 plan-level users (Free, Pro, Business) with realistic workspaces,
 * businesses, subscriptions, inquiries, quotes, and supporting data.
 *
 * Run:  npm run db:seed-demo
 * Reqs: DATABASE_URL + BETTER_AUTH_SECRET in .env
 *
 * ⚠ Truncates ALL data before seeding. Dev only.
 */
import "dotenv/config";

import { eq, sql } from "drizzle-orm";

import { createInquiryFormPreset } from "../features/inquiries/inquiry-forms";
import type { BusinessType } from "../features/inquiries/business-types";
import { auth } from "../lib/auth/config";
import { db, dbConnection } from "../lib/db/client";
import {
  activityLogs,
  businessMembers,
  businesses,
  businessInquiryForms,
  businessMemories,
  inquiries,
  inquiryNotes,
  profiles,
  quoteItems,
  quotes,
  replySnippets,
  user,
  workspaceMembers,
  workspaces,
  workspaceSubscriptions,
} from "../lib/db/schema";
import { env } from "../lib/env";
import type { WorkspacePlan } from "../lib/plans/plans";

/* ═══════════════════════════════════════════════════════════════════════════
 * Constants
 * ═══════════════════════════════════════════════════════════════════════════ */

const PASSWORD = env.DEMO_OWNER_PASSWORD ?? "ChangeMe123456!";
const demoManagerEmail = process.env.DEMO_MANAGER_EMAIL ?? "manager@requo.local";
const demoStaffEmail = process.env.DEMO_STAFF_EMAIL ?? "staff@requo.local";
const demoOutsiderEmail =
  process.env.DEMO_OUTSIDER_EMAIL ?? "outsider@requo.local";
const primaryDemoUser: SeedUserConfig = {
  name: env.DEMO_OWNER_NAME ?? "Morgan Lee",
  email: env.DEMO_OWNER_EMAIL ?? "demo@requo.local",
  plan: "business",
  workspaceName: "BrightSide Workspace",
  workspaceSlug: "brightside-workspace",
  businesses: [
    {
      name: env.DEMO_BUSINESS_NAME ?? "BrightSide Print Studio",
      slug: env.DEMO_BUSINESS_SLUG ?? "brightside-print-studio",
      businessType: "print_signage",
      shortDescription:
        "Print, signage, and display graphics for storefronts, events, and campaigns.",
      defaultCurrency: "USD",
      countryCode: "US",
      contactEmail: "hello@brightsideprint.com",
      inquiryCount: 24,
      quoteRatio: 0.5,
      aiTonePreference: "balanced",
    },
  ],
  teamMembers: [
    {
      name: "Ava Morris",
      email: demoManagerEmail,
      businessRole: "manager",
    },
    {
      name: "Noah Price",
      email: demoStaffEmail,
      businessRole: "staff",
    },
  ],
};

type SeedUserConfig = {
  name: string;
  email: string;
  plan: WorkspacePlan;
  workspaceName: string;
  workspaceSlug: string;
  businesses: SeedBusinessConfig[];
  teamMembers?: SeedTeamMember[];
};

type SeedBusinessConfig = {
  name: string;
  slug: string;
  businessType: BusinessType;
  shortDescription: string;
  defaultCurrency: string;
  countryCode: string;
  contactEmail: string;
  inquiryCount: number;
  quoteRatio: number; // % of inquiries that get a quote
  aiTonePreference: "balanced" | "warm" | "direct" | "formal";
};

type SeedTeamMember = {
  name: string;
  email: string;
  businessRole: "manager" | "staff";
};

const USERS: SeedUserConfig[] = [
  primaryDemoUser,
  {
    name: "Maria Santos",
    email: "free@requo.dev",
    plan: "free",
    workspaceName: "Maria's Workspace",
    workspaceSlug: "maria-ws",
    businesses: [
      {
        name: "Santos Print Shop",
        slug: "santos-print-shop",
        businessType: "print_signage",
        shortDescription: "Custom printing, signage, and display graphics for local businesses.",
        defaultCurrency: "PHP",
        countryCode: "PH",
        contactEmail: "maria@santosprint.ph",
        inquiryCount: 60,
        quoteRatio: 0.5,
        aiTonePreference: "warm",
      },
    ],
  },
  {
    name: "James Carter",
    email: "pro@requo.dev",
    plan: "pro",
    workspaceName: "Carter Interiors",
    workspaceSlug: "carter-interiors-ws",
    businesses: [
      {
        name: "Carter Interior Design",
        slug: "carter-interior-design",
        businessType: "creative_marketing_services",
        shortDescription: "Residential and commercial interior design consultancy.",
        defaultCurrency: "USD",
        countryCode: "US",
        contactEmail: "james@carterinteriors.com",
        inquiryCount: 150,
        quoteRatio: 0.55,
        aiTonePreference: "balanced",
      },
    ],
  },
  {
    name: "Rafael Reyes",
    email: "business@requo.dev",
    plan: "business",
    workspaceName: "Reyes Group",
    workspaceSlug: "reyes-group-ws",
    businesses: [
      {
        name: "Reyes Contractors",
        slug: "reyes-contractors",
        businessType: "contractor_home_improvement",
        shortDescription: "General contracting, renovations, and build-outs across Luzon.",
        defaultCurrency: "PHP",
        countryCode: "PH",
        contactEmail: "info@reyescontractors.ph",
        inquiryCount: 250,
        quoteRatio: 0.5,
        aiTonePreference: "direct",
      },
      {
        name: "Reyes Event Services",
        slug: "reyes-event-services",
        businessType: "event_services_rentals",
        shortDescription: "Corporate event setup, tent rentals, and audio/visual production.",
        defaultCurrency: "PHP",
        countryCode: "PH",
        contactEmail: "events@reyesgroup.ph",
        inquiryCount: 80,
        quoteRatio: 0.5,
        aiTonePreference: "warm",
      },
    ],
    teamMembers: [
      { name: "Ana Mendez", email: "manager@requo.dev", businessRole: "manager" },
      { name: "Paolo Cruz", email: "staff@requo.dev", businessRole: "staff" },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
 * Deterministic PRNG (FNV-1a)
 * ═══════════════════════════════════════════════════════════════════════════ */

function createRng(seed: string) {
  let hash = 2166136261;
  for (const ch of seed) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return () => {
    hash += 0x6d2b79f5;
    let n = Math.imul(hash ^ (hash >>> 15), 1 | hash);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min)) + min;
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[randInt(rng, 0, arr.length)];
}

function chance(rng: () => number, p: number) {
  return rng() < p;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * ID helpers
 * ═══════════════════════════════════════════════════════════════════════════ */

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Date helpers
 * ═══════════════════════════════════════════════════════════════════════════ */

function daysAgo(d: number, h = 10, m = 0) {
  const date = new Date();
  date.setUTCHours(h, m, 0, 0);
  date.setUTCDate(date.getUTCDate() - d);
  return date;
}

function addDays(date: Date, d: number) {
  return new Date(date.getTime() + d * 86_400_000);
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Realistic data pools
 * ═══════════════════════════════════════════════════════════════════════════ */

const FIRST_NAMES = [
  "James", "Maya", "Daniel", "Olivia", "Priya", "Carlos", "Harper", "Noah",
  "Amelia", "Marcus", "Ava", "Elena", "Jordan", "Sofia", "Adrian", "Natalie",
  "Leo", "Riley", "Mina", "Theo", "Chloe", "Ethan", "Grace", "Liam",
  "Isabella", "Benjamin", "Hannah", "Samuel", "Victoria", "Nathan",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Kim", "Patel", "Garcia", "Martinez", "Nguyen",
  "Anderson", "Thomas", "Bennett", "Park", "Shah", "Rivera", "Hughes",
  "Carter", "Sullivan", "Lopez", "Wilson", "Santos", "Reyes",
  "Cruz", "Torres", "Bautista", "Mendoza", "Dela Cruz", "Ramirez",
];

const COMPANIES = [
  "North Fork Studio", "Harbor Collective", "Summit Partners", "Brightleaf Co",
  "Cedar Labs", "Atlas Supply", "Riverview Market", "Maple Works",
  "Bluebird Media", "Foundry Group", "Parkside Wellness", "Oakline Advisors",
  "Copper Company", "Mainline Builders", "Willow Clinic", "Zenith Corp",
  "Lakeshore Properties", "Goldstar Enterprises", "Pacific Edge", "Metro Designs",
];

const INQUIRY_SUBJECTS: Record<string, string[]> = {
  print_signage: [
    "Storefront signage quote", "Banner printing for grand opening",
    "Vehicle wrap pricing", "Trade show booth graphics", "Window decals for new location",
    "Menu board design and print", "Real estate sign order", "Wall mural for office",
    "Billboard design request", "Promotional flyer printing",
  ],
  creative_marketing_services: [
    "Brand identity redesign", "Website redesign project", "Marketing collateral package",
    "Logo design for new venture", "Social media content package", "Annual report design",
    "Brochure and catalog design", "Email newsletter template", "Pitch deck design",
    "Packaging design for product launch",
  ],
  contractor_home_improvement: [
    "Kitchen renovation quote", "Bathroom remodel pricing", "Roof repair estimate",
    "New deck construction", "Home addition assessment", "Flooring replacement",
    "Window and door replacement", "Basement finishing project", "Painting interior and exterior",
    "Fence installation quote", "Drywall repair and patching", "Plumbing fixture upgrade",
  ],
  event_services_rentals: [
    "Corporate gala setup request", "Wedding tent rental quote", "Conference AV setup",
    "Birthday party rentals", "Product launch event setup", "Outdoor concert staging",
    "Holiday party planning", "Team building event setup", "Trade show booth assembly",
    "Award ceremony production",
  ],
};

const INQUIRY_DETAILS: string[] = [
  "We need a detailed quote for this project. Please include timeline and payment terms.",
  "Looking for competitive pricing on this. We have a tight deadline and need to move fast.",
  "Can you provide options at different price points? We want to compare before deciding.",
  "This is for a repeat client and we need to deliver high quality. Please advise on best approach.",
  "We have a strict budget for this project. Please let us know what's feasible within our range.",
  "Need this completed within the next 3 weeks. Please confirm availability and lead time.",
  "We're comparing several vendors. A clear breakdown of costs would help us decide.",
  "This is part of a larger project. If this phase goes well, there's more work coming.",
  "We'd like to set up a quick call to discuss the details before you quote.",
  "Please include delivery and installation in the quote if applicable.",
];

const QUOTE_TITLES: Record<string, string[]> = {
  print_signage: [
    "Custom Signage Package", "Banner Production", "Display Graphics Suite",
    "Print Run — Marketing Materials", "Vehicle Wrap Installation",
  ],
  creative_marketing_services: [
    "Brand Identity Package", "Website Design & Build", "Marketing Collateral Bundle",
    "Content Production Package", "Design Retainer — Monthly",
  ],
  contractor_home_improvement: [
    "Renovation Scope of Work", "Repair & Maintenance Package", "Build-Out Estimate",
    "Remodeling Project Proposal", "Construction Package",
  ],
  event_services_rentals: [
    "Event Setup Package", "Rental Bundle — Corporate", "AV Production Quote",
    "Full Event Production", "Tent & Furnishing Package",
  ],
};

const QUOTE_ITEMS: Record<string, Array<{ desc: string; minPrice: number; maxPrice: number }>> = {
  print_signage: [
    { desc: "Large format banner (8ft x 3ft)", minPrice: 4500, maxPrice: 12000 },
    { desc: "Vinyl lettering and installation", minPrice: 2500, maxPrice: 8000 },
    { desc: "Acrylic signage with LED backlight", minPrice: 15000, maxPrice: 45000 },
    { desc: "Design and layout fee", minPrice: 3000, maxPrice: 8000 },
    { desc: "Rush production surcharge", minPrice: 1500, maxPrice: 5000 },
  ],
  creative_marketing_services: [
    { desc: "Brand strategy workshop", minPrice: 25000, maxPrice: 75000 },
    { desc: "Logo design (3 concepts)", minPrice: 15000, maxPrice: 40000 },
    { desc: "Website design — 5 pages", minPrice: 50000, maxPrice: 150000 },
    { desc: "Social media content (10 posts)", minPrice: 8000, maxPrice: 20000 },
    { desc: "Print collateral design", minPrice: 10000, maxPrice: 30000 },
  ],
  contractor_home_improvement: [
    { desc: "Demolition and site prep", minPrice: 15000, maxPrice: 50000 },
    { desc: "Materials — tiles, fixtures, hardware", minPrice: 25000, maxPrice: 100000 },
    { desc: "Skilled labor — 5 work days", minPrice: 30000, maxPrice: 80000 },
    { desc: "Electrical and plumbing work", minPrice: 20000, maxPrice: 60000 },
    { desc: "Finishing and cleanup", minPrice: 8000, maxPrice: 20000 },
  ],
  event_services_rentals: [
    { desc: "Tent rental — 10m x 20m", minPrice: 25000, maxPrice: 60000 },
    { desc: "Sound system and lighting", minPrice: 15000, maxPrice: 45000 },
    { desc: "Tables and chairs (50 guests)", minPrice: 8000, maxPrice: 20000 },
    { desc: "Setup and teardown crew", minPrice: 10000, maxPrice: 25000 },
    { desc: "Generator and power distribution", minPrice: 5000, maxPrice: 15000 },
  ],
};

const REPLY_SNIPPETS = [
  { title: "Request dimensions", body: "Could you share the exact dimensions or measurements needed? This will help us provide an accurate quote." },
  { title: "Confirm timeline", body: "What's your ideal completion date? We want to make sure we can meet your schedule." },
  { title: "Budget clarification", body: "Do you have a target budget range in mind? This helps us tailor the proposal to your needs." },
  { title: "Thank you for inquiry", body: "Thanks for reaching out! We'll review your request and get back to you within 24 hours with a detailed proposal." },
];

const KNOWLEDGE_ITEMS = [
  { title: "Standard turnaround", content: "Our standard production turnaround is 5-7 business days from design approval. Rush orders can be completed in 2-3 business days at a 25% surcharge." },
  { title: "Payment terms", content: "We require a 50% deposit to begin production. The remaining balance is due upon completion before delivery. We accept bank transfer, GCash, and credit card payment." },
];

const INQUIRY_STATUSES = ["new", "waiting", "quoted", "won", "lost", "archived"] as const;
const INQUIRY_STATUS_WEIGHTS = [20, 18, 22, 17, 13, 10];

const QUOTE_STATUSES = ["draft", "sent", "accepted", "rejected", "expired"] as const;
const QUOTE_STATUS_WEIGHTS = [12, 25, 30, 18, 15];

const RESPONSE_MESSAGES = {
  accepted: [
    "This works for us. Please move ahead and send next steps.",
    "Approved. Ready to schedule the work.",
    "Looks good — please confirm timing so we can lock it in.",
  ],
  rejected: [
    "Thanks for the quote. We decided to go a different direction for now.",
    "We're pausing this scope and will revisit later.",
    "Appreciate the proposal, but we moved ahead with another vendor.",
  ],
};

/* ═══════════════════════════════════════════════════════════════════════════
 * Weighted random
 * ═══════════════════════════════════════════════════════════════════════════ */

function pickWeighted<T>(rng: () => number, items: readonly T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let threshold = rng() * total;
  for (let i = 0; i < items.length; i++) {
    threshold -= weights[i];
    if (threshold <= 0) return items[i];
  }
  return items[items.length - 1];
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Reset
 * ═══════════════════════════════════════════════════════════════════════════ */

async function resetDatabase() {
  if (env.NODE_ENV === "production") {
    throw new Error("Refusing to reset in production!");
  }

  console.log("🗑  Resetting database...");

  await db.execute(sql`
    TRUNCATE TABLE
      "user",
      "session",
      "account",
      "verification",
      "profiles",
      "workspaces",
      "workspace_members",
      "workspace_subscriptions",
      "billing_events",
      "payment_attempts",
      "businesses",
      "business_members",
      "business_member_invites",
      "business_inquiry_forms",
      "inquiries",
      "inquiry_attachments",
      "inquiry_notes",
      "quotes",
      "quote_items",
      "activity_logs",
      "business_notifications",
      "business_notification_states",
      "reply_snippets",
      "business_memories",
      "quote_library_entries",
      "quote_library_entry_items",
      "google_calendar_connections",
      "calendar_events",
      "public_action_events"
    CASCADE
  `);

  console.log("   Done.\n");
}

/* ═══════════════════════════════════════════════════════════════════════════
 * User creation (uses Better Auth for proper password hashing)
 * ═══════════════════════════════════════════════════════════════════════════ */

async function createUser(name: string, email: string): Promise<string> {
  // Sign up via Better Auth to get proper password hash + account record
  const result = await auth.api.signUpEmail({
    body: { name, email, password: PASSWORD },
  });

  if (!result?.user?.id) {
    throw new Error(`Failed to create user ${email}`);
  }

  const userId = result.user.id;

  await db
    .update(user)
    .set({
      emailVerified: true,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));

  // Ensure profile with onboarding complete
  await db
    .insert(profiles)
    .values({
      userId,
      fullName: name,
      onboardingCompletedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: { fullName: name, onboardingCompletedAt: new Date(), updatedAt: new Date() },
    });

  return userId;
}

async function seedStableSmokeFixtures(params: {
  businessId: string;
  formId: string;
  ownerId: string;
}) {
  const now = new Date();
  const demoInquiryId = "demo_inquiry_quoted_booth_kit";
  const storefrontInquiryId = "demo_inquiry_new_storefront";
  const archivedInquiryId = "demo_inquiry_archived_showroom_refresh";
  const trashedInquiryId = "demo_inquiry_trashed_test_submission";
  const historyQuoteId = "demo_quote_history_0998";
  const sentQuoteId = "demo_quote_sent_1002";
  const acceptedQuoteId = "demo_quote_accepted_1003";
  const expiredQuoteId = "demo_quote_expired_1005";
  const voidedQuoteId = "demo_quote_voided_1006";
  const publicQuoteToken =
    env.DEMO_QUOTE_PUBLIC_TOKEN ?? "demoquote1002senttoken";
  const expiredQuoteToken =
    env.DEMO_EXPIRED_QUOTE_PUBLIC_TOKEN ?? "demoquote1005expiredtoken";
  const voidedQuoteToken =
    env.DEMO_VOIDED_QUOTE_PUBLIC_TOKEN ?? "demoquote1006voidedtoken";
  const submittedFieldSnapshot = {
    version: 1 as const,
    businessType: "print_signage" as const,
    fields: [],
  };
  const inquiryFixtures: Array<typeof inquiries.$inferInsert> = [
    {
      id: demoInquiryId,
      businessId: params.businessId,
      businessInquiryFormId: params.formId,
      status: "quoted",
      subject: "Foundry Labs booth kit",
      customerName: "Taylor Nguyen",
      customerEmail: "taylor@example.com",
      customerPhone: "+1 415 555 0199",
      serviceCategory: "Event signage",
      details:
        "Need modular booth graphics, a counter wrap, and two directional signs for an upcoming expo.",
      source: "public_form",
      quoteRequested: true,
      submittedFieldSnapshot,
      submittedAt: daysAgo(5),
      createdAt: daysAgo(5),
      updatedAt: daysAgo(3),
    },
    {
      id: storefrontInquiryId,
      businessId: params.businessId,
      businessInquiryFormId: params.formId,
      status: "waiting",
      subject: "Foundry Labs storefront rebrand",
      customerName: "Taylor Nguyen",
      customerEmail: "taylor@example.com",
      customerPhone: "+1 415 555 0199",
      serviceCategory: "Office signage",
      details:
        "Need fresh exterior lettering, lobby signage, and directional panels for the new storefront rollout.",
      source: "public_form",
      quoteRequested: true,
      submittedFieldSnapshot,
      submittedAt: daysAgo(21),
      createdAt: daysAgo(21),
      updatedAt: daysAgo(19),
    },
    {
      id: archivedInquiryId,
      businessId: params.businessId,
      businessInquiryFormId: params.formId,
      status: "waiting",
      subject: "Showroom graphics refresh",
      customerName: "Jordan Silva",
      customerEmail: "jordan.silva@example.com",
      customerPhone: "+1 415 555 0147",
      serviceCategory: "Showroom refresh",
      details:
        "Seasonal showroom update request kept for reference after pricing was paused.",
      source: "public_form",
      quoteRequested: false,
      submittedFieldSnapshot,
      submittedAt: daysAgo(14),
      archivedAt: daysAgo(6),
      archivedBy: params.ownerId,
      createdAt: daysAgo(14),
      updatedAt: daysAgo(6),
    },
    {
      id: trashedInquiryId,
      businessId: params.businessId,
      businessInquiryFormId: params.formId,
      status: "new",
      subject: "Spam test submission",
      customerName: "Spam Bot",
      customerEmail: "spam@example.com",
      customerPhone: null,
      serviceCategory: "Test submission",
      details: "Automated junk request fixture that should only appear in trash.",
      source: "public_form",
      quoteRequested: false,
      submittedFieldSnapshot,
      submittedAt: daysAgo(2),
      deletedAt: daysAgo(1),
      deletedBy: params.ownerId,
      createdAt: daysAgo(2),
      updatedAt: daysAgo(1),
    },
  ];

  await db.insert(inquiries).values(inquiryFixtures);

  await db.insert(activityLogs).values([
    {
      id: id("act"),
      businessId: params.businessId,
      inquiryId: demoInquiryId,
      actorUserId: params.ownerId,
      type: "quote.created",
      summary: "Quote Q-SMOKE-1002 created for Taylor Nguyen",
      metadata: {
        quoteNumber: "Q-SMOKE-1002",
      },
      createdAt: daysAgo(4),
      updatedAt: daysAgo(4),
    },
    {
      id: id("act"),
      businessId: params.businessId,
      inquiryId: storefrontInquiryId,
      actorUserId: params.ownerId,
      type: "quote.sent",
      summary: "Quote Q-SMOKE-0998 sent to Taylor Nguyen",
      metadata: {
        quoteNumber: "Q-SMOKE-0998",
      },
      createdAt: daysAgo(18),
      updatedAt: daysAgo(18),
    },
    {
      id: id("act"),
      businessId: params.businessId,
      inquiryId: archivedInquiryId,
      actorUserId: params.ownerId,
      type: "inquiry.archived",
      summary: "Request archived after the customer paused the showroom refresh.",
      metadata: {},
      createdAt: daysAgo(6),
      updatedAt: daysAgo(6),
    },
    {
      id: id("act"),
      businessId: params.businessId,
      inquiryId: trashedInquiryId,
      actorUserId: params.ownerId,
      type: "inquiry.trashed",
      summary: "Request moved to trash after it was confirmed as junk.",
      metadata: {},
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
    {
      id: id("act"),
      businessId: params.businessId,
      quoteId: voidedQuoteId,
      actorUserId: params.ownerId,
      type: "quote.voided",
      summary: "Quote Q-SMOKE-1006 voided after the scope changed.",
      metadata: {
        quoteNumber: "Q-SMOKE-1006",
      },
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
    },
  ]);

  await db.insert(quotes).values([
    {
      id: historyQuoteId,
      businessId: params.businessId,
      inquiryId: storefrontInquiryId,
      status: "accepted",
      quoteNumber: "Q-SMOKE-0998",
      publicToken: "smoke-history-0998-token",
      title: "Foundry Labs rebrand signage package",
      customerName: "Taylor Nguyen",
      customerEmail: "taylor@example.com",
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
      validUntil: toDateStr(addDays(now, -3)),
      createdAt: daysAgo(19),
      updatedAt: daysAgo(16),
    },
    {
      id: sentQuoteId,
      businessId: params.businessId,
      inquiryId: demoInquiryId,
      status: "sent",
      quoteNumber: "Q-SMOKE-1002",
      publicToken: publicQuoteToken,
      title: "Foundry Labs booth kit",
      customerName: "Taylor Nguyen",
      customerEmail: "taylor@example.com",
      currency: "USD",
      notes: "Production starts after approval. Delivery is included in the quoted total.",
      subtotalInCents: 245000,
      discountInCents: 15000,
      totalInCents: 230000,
      sentAt: daysAgo(2),
      publicViewedAt: daysAgo(1),
      validUntil: toDateStr(addDays(now, 14)),
      createdAt: daysAgo(4),
      updatedAt: daysAgo(2),
    },
    {
      id: acceptedQuoteId,
      businessId: params.businessId,
      inquiryId: null,
      status: "accepted",
      quoteNumber: "Q-SMOKE-1003",
      publicToken: "smoke-accepted-1003-token",
      title: "Luma Coffee counter signage package",
      customerName: "Alex Morgan",
      customerEmail: "alex.morgan@example.com",
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
      validUntil: toDateStr(addDays(now, 10)),
      createdAt: daysAgo(10),
      updatedAt: daysAgo(7),
    },
    {
      id: expiredQuoteId,
      businessId: params.businessId,
      inquiryId: demoInquiryId,
      status: "expired",
      quoteNumber: "Q-SMOKE-1005",
      publicToken: expiredQuoteToken,
      title: "Foundry Labs booth kit refresh",
      customerName: "Taylor Nguyen",
      customerEmail: "taylor@example.com",
      currency: "USD",
      notes: "Expired quote fixture for public testing.",
      subtotalInCents: 120000,
      discountInCents: 0,
      totalInCents: 120000,
      sentAt: daysAgo(25),
      publicViewedAt: daysAgo(24),
      validUntil: toDateStr(addDays(now, -2)),
      createdAt: daysAgo(30),
      updatedAt: daysAgo(20),
    },
    {
      id: voidedQuoteId,
      businessId: params.businessId,
      inquiryId: null,
      status: "voided",
      quoteNumber: "Q-SMOKE-1006",
      publicToken: voidedQuoteToken,
      title: "Elm Street wayfinding package",
      customerName: "Jamie Park",
      customerEmail: "jamie.park@example.com",
      currency: "USD",
      notes: "Voided quote fixture kept for lifecycle and reporting coverage.",
      subtotalInCents: 110000,
      discountInCents: 0,
      totalInCents: 110000,
      sentAt: daysAgo(8),
      publicViewedAt: daysAgo(7),
      validUntil: toDateStr(addDays(now, 7)),
      voidedAt: daysAgo(5),
      voidedBy: params.ownerId,
      archivedAt: daysAgo(4),
      archivedBy: params.ownerId,
      createdAt: daysAgo(10),
      updatedAt: daysAgo(4),
    },
  ]);

  await db.insert(quoteItems).values([
    {
      id: id("qti"),
      businessId: params.businessId,
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
      id: id("qti"),
      businessId: params.businessId,
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
      id: id("qti"),
      businessId: params.businessId,
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
      id: id("qti"),
      businessId: params.businessId,
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
      id: id("qti"),
      businessId: params.businessId,
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
      id: id("qti"),
      businessId: params.businessId,
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
      id: id("qti"),
      businessId: params.businessId,
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
      id: id("qti"),
      businessId: params.businessId,
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
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Workspace + subscription creation
 * ═══════════════════════════════════════════════════════════════════════════ */

async function createWorkspace(
  config: SeedUserConfig,
  ownerId: string,
): Promise<string> {
  const wsId = id("ws");
  const now = new Date();

  await db.insert(workspaces).values({
    id: wsId,
    name: config.workspaceName,
    slug: config.workspaceSlug,
    plan: config.plan,
    ownerUserId: ownerId,
    createdAt: daysAgo(180),
    updatedAt: now,
  });

  await db.insert(workspaceMembers).values({
    id: id("wm"),
    workspaceId: wsId,
    userId: ownerId,
    role: "owner",
    createdAt: daysAgo(180),
    updatedAt: now,
  });

  // Create subscription row for paid plans
  if (config.plan !== "free") {
    const periodStart = daysAgo(15);
    const periodEnd = addDays(periodStart, 30);

    await db.insert(workspaceSubscriptions).values({
      id: id("sub"),
      workspaceId: wsId,
      status: "active",
      plan: config.plan,
      billingProvider: config.plan === "business" ? "paymongo" : "paddle",
      billingCurrency: config.plan === "business" ? "PHP" : "USD",
      providerCustomerId: `cus_demo_${config.workspaceSlug}`,
      providerSubscriptionId: `sub_demo_${config.workspaceSlug}`,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      createdAt: daysAgo(90),
      updatedAt: now,
    });
  }

  return wsId;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Business creation
 * ═══════════════════════════════════════════════════════════════════════════ */

async function createBusiness(
  config: SeedBusinessConfig,
  wsId: string,
  ownerId: string,
): Promise<{ businessId: string; formId: string }> {
  const bizId = id("biz");
  const formPreset = createInquiryFormPreset({
    businessType: config.businessType,
    businessName: config.name,
    businessShortDescription: config.shortDescription,
  });
  const formId = id("ifm");
  const now = new Date();

  await db.insert(businesses).values({
    id: bizId,
    workspaceId: wsId,
    name: config.name,
    slug: config.slug,
    businessType: config.businessType,
    shortDescription: config.shortDescription,
    contactEmail: config.contactEmail,
    defaultCurrency: config.defaultCurrency,
    countryCode: config.countryCode,
    aiTonePreference: config.aiTonePreference,
    publicInquiryEnabled: true,
    createdAt: daysAgo(180),
    updatedAt: now,
  });

  await db.insert(businessInquiryForms).values({
    id: formId,
    businessId: bizId,
    name: formPreset.name,
    slug: formPreset.slug,
    businessType: formPreset.businessType,
    isDefault: true,
    publicInquiryEnabled: true,
    inquiryFormConfig: formPreset.inquiryFormConfig,
    inquiryPageConfig: formPreset.inquiryPageConfig,
    createdAt: daysAgo(180),
    updatedAt: now,
  });

  await db.insert(businessMembers).values({
    id: id("bm"),
    businessId: bizId,
    userId: ownerId,
    role: "owner",
    createdAt: daysAgo(180),
    updatedAt: now,
  });

  // Seed reply snippets
  for (const snippet of REPLY_SNIPPETS) {
    await db.insert(replySnippets).values({
      id: id("rsp"),
      businessId: bizId,
      title: snippet.title,
      body: snippet.body,
      createdAt: daysAgo(170),
      updatedAt: daysAgo(170),
    });
  }

  // Seed knowledge memories
  for (let i = 0; i < KNOWLEDGE_ITEMS.length; i++) {
    await db.insert(businessMemories).values({
      id: id("mem"),
      businessId: bizId,
      title: KNOWLEDGE_ITEMS[i].title,
      content: KNOWLEDGE_ITEMS[i].content,
      position: i,
      createdAt: daysAgo(160),
      updatedAt: daysAgo(160),
    });
  }

  return { businessId: bizId, formId };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Inquiry + Quote generation
 * ═══════════════════════════════════════════════════════════════════════════ */

async function seedBusinessData(
  bizConfig: SeedBusinessConfig,
  businessId: string,
  formId: string,
  ownerId: string,
): Promise<{ inquiryCount: number; quoteCount: number; quoteItemCount: number }> {
  const rng = createRng(`${bizConfig.slug}-data`);
  const subjects = INQUIRY_SUBJECTS[bizConfig.businessType] ?? INQUIRY_SUBJECTS["print_signage"];
  const quoteTitles = QUOTE_TITLES[bizConfig.businessType] ?? QUOTE_TITLES["print_signage"];
  const quoteItemPool = QUOTE_ITEMS[bizConfig.businessType] ?? QUOTE_ITEMS["print_signage"];

  const inquiryRows: Array<typeof inquiries.$inferInsert> = [];
  const quoteRows: Array<typeof quotes.$inferInsert> = [];
  const quoteItemRows: Array<typeof quoteItems.$inferInsert> = [];
  const activityRows: Array<typeof activityLogs.$inferInsert> = [];
  const noteRows: Array<typeof inquiryNotes.$inferInsert> = [];

  let quoteNumber = 1001;

  for (let i = 0; i < bizConfig.inquiryCount; i++) {
    const inquiryId = id("inq");
    const firstName = pick(rng, FIRST_NAMES);
    const lastName = pick(rng, LAST_NAMES);
    const customerName = `${firstName} ${lastName}`;
    const customerEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/[^a-z]/g, "")}@example.com`;
    const companyName = chance(rng, 0.6) ? pick(rng, COMPANIES) : null;
    const phone = chance(rng, 0.7) ? `(${randInt(rng, 200, 999)}) ${randInt(rng, 200, 999)}-${String(randInt(rng, 0, 10000)).padStart(4, "0")}` : null;

    // Spread inquiries over the last 180 days
    const daysBack = randInt(rng, 0, 180);
    const submittedAt = daysAgo(daysBack, randInt(rng, 7, 20), randInt(rng, 0, 60));
    const status = pickWeighted(rng, INQUIRY_STATUSES, INQUIRY_STATUS_WEIGHTS);
    const serviceCategory = pick(rng, subjects);
    const hasDeadline = chance(rng, 0.4);

    inquiryRows.push({
      id: inquiryId,
      businessId,
      businessInquiryFormId: formId,
      status,
      subject: serviceCategory,
      customerName,
      customerEmail,
      customerPhone: phone,
      serviceCategory,
      requestedDeadline: hasDeadline ? toDateStr(addDays(submittedAt, randInt(rng, 7, 60))) : null,
      budgetText: chance(rng, 0.5) ? `$${randInt(rng, 5, 50) * 100} - $${randInt(rng, 50, 200) * 100}` : null,
      companyName,
      details: pick(rng, INQUIRY_DETAILS),
      source: "public_form",
      quoteRequested: chance(rng, 0.85),
      submittedAt,
      lastRespondedAt: ["quoted", "won", "lost"].includes(status) ? addDays(submittedAt, randInt(rng, 1, 5)) : null,
      createdAt: submittedAt,
      updatedAt: submittedAt,
    });

    // Activity log for the inquiry
    activityRows.push({
      id: id("act"),
      businessId,
      inquiryId,
      actorUserId: null,
      type: "inquiry.submitted",
      summary: `${customerName} submitted an inquiry: ${serviceCategory}`,
      metadata: { source: "public_form" },
      createdAt: submittedAt,
      updatedAt: submittedAt,
    });

    // Add note for some inquiries
    if (chance(rng, 0.25)) {
      noteRows.push({
        id: id("note"),
        businessId,
        inquiryId,
        authorUserId: ownerId,
        body: pick(rng, [
          "Followed up via phone — client is interested. Will send quote tomorrow.",
          "Client mentioned they need this urgently. Prioritize.",
          "Waiting for additional measurements before quoting.",
          "Budget seems tight — may need to propose a scaled-down option.",
          "Good lead. They were referred by an existing client.",
        ]),
        createdAt: addDays(submittedAt, randInt(rng, 0, 3)),
        updatedAt: addDays(submittedAt, randInt(rng, 0, 3)),
      });
    }

    // Create quote for some inquiries
    if (chance(rng, bizConfig.quoteRatio) && ["quoted", "won", "lost", "waiting"].includes(status)) {
      const quoteId = id("qt");
      const qNum = String(quoteNumber++).padStart(4, "0");
      const quoteStatus = pickWeighted(rng, QUOTE_STATUSES, QUOTE_STATUS_WEIGHTS);
      const quoteCreatedAt = addDays(submittedAt, randInt(rng, 1, 4));
      const sentAt = quoteStatus !== "draft" ? addDays(quoteCreatedAt, randInt(rng, 0, 2)) : null;
      const validUntil = toDateStr(addDays(quoteCreatedAt, 14));

      // Generate 2-4 line items
      const itemCount = randInt(rng, 2, 5);
      let subtotal = 0;
      const itemRows: Array<typeof quoteItems.$inferInsert> = [];

      for (let j = 0; j < itemCount; j++) {
        const template = pick(rng, quoteItemPool);
        const qty = randInt(rng, 1, 5);
        const unitPrice = randInt(rng, template.minPrice, template.maxPrice);
        const lineTotal = qty * unitPrice;
        subtotal += lineTotal;

        itemRows.push({
          id: id("qti"),
          businessId,
          quoteId,
          description: template.desc,
          quantity: qty,
          unitPriceInCents: unitPrice,
          lineTotalInCents: lineTotal,
          position: j,
          createdAt: quoteCreatedAt,
          updatedAt: quoteCreatedAt,
        });
      }

      const discount = chance(rng, 0.2) ? Math.floor(subtotal * randInt(rng, 5, 15) / 100) : 0;
      const total = subtotal - discount;

      let acceptedAt: Date | null = null;
      let customerRespondedAt: Date | null = null;
      let customerResponseMessage: string | null = null;
      let postAcceptanceStatus: "none" | "booked" | "scheduled" = "none";

      if (quoteStatus === "accepted" && sentAt) {
        acceptedAt = addDays(sentAt, randInt(rng, 1, 7));
        customerRespondedAt = acceptedAt;
        customerResponseMessage = pick(rng, RESPONSE_MESSAGES.accepted);
        postAcceptanceStatus = chance(rng, 0.4) ? "booked" : chance(rng, 0.3) ? "scheduled" : "none";
      } else if (quoteStatus === "rejected" && sentAt) {
        customerRespondedAt = addDays(sentAt, randInt(rng, 2, 10));
        customerResponseMessage = pick(rng, RESPONSE_MESSAGES.rejected);
      }

      quoteRows.push({
        id: quoteId,
        businessId,
        inquiryId,
        status: quoteStatus,
        quoteNumber: `Q-${qNum}`,
        publicToken: id("tok"),
        title: pick(rng, quoteTitles),
        customerName,
        customerEmail,
        currency: bizConfig.defaultCurrency,
        notes: chance(rng, 0.6) ? "Prices valid for 14 days. 50% deposit required to proceed." : null,
        subtotalInCents: subtotal,
        discountInCents: discount,
        totalInCents: total,
        sentAt,
        acceptedAt,
        publicViewedAt: sentAt ? addDays(sentAt, randInt(rng, 0, 3)) : null,
        customerRespondedAt,
        customerResponseMessage,
        postAcceptanceStatus,
        validUntil,
        createdAt: quoteCreatedAt,
        updatedAt: quoteCreatedAt,
      });

      quoteItemRows.push(...itemRows);

      // Activity for quote
      activityRows.push({
        id: id("act"),
        businessId,
        inquiryId,
        quoteId,
        actorUserId: ownerId,
        type: "quote.created",
        summary: `Quote Q-${qNum} created for ${customerName}`,
        metadata: { quoteNumber: `Q-${qNum}`, total },
        createdAt: quoteCreatedAt,
        updatedAt: quoteCreatedAt,
      });

      if (sentAt) {
        activityRows.push({
          id: id("act"),
          businessId,
          inquiryId,
          quoteId,
          actorUserId: ownerId,
          type: "quote.sent",
          summary: `Quote Q-${qNum} sent to ${customerEmail}`,
          metadata: {},
          createdAt: sentAt,
          updatedAt: sentAt,
        });
      }
    }
  }

  // Batch insert everything
  const BATCH = 100;

  for (let i = 0; i < inquiryRows.length; i += BATCH) {
    await db.insert(inquiries).values(inquiryRows.slice(i, i + BATCH));
  }

  for (let i = 0; i < quoteRows.length; i += BATCH) {
    await db.insert(quotes).values(quoteRows.slice(i, i + BATCH));
  }

  for (let i = 0; i < quoteItemRows.length; i += BATCH) {
    await db.insert(quoteItems).values(quoteItemRows.slice(i, i + BATCH));
  }

  for (let i = 0; i < activityRows.length; i += BATCH) {
    await db.insert(activityLogs).values(activityRows.slice(i, i + BATCH));
  }

  for (let i = 0; i < noteRows.length; i += BATCH) {
    await db.insert(inquiryNotes).values(noteRows.slice(i, i + BATCH));
  }

  return {
    inquiryCount: inquiryRows.length,
    quoteCount: quoteRows.length,
    quoteItemCount: quoteItemRows.length,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Main
 * ═══════════════════════════════════════════════════════════════════════════ */

async function main() {
  console.log("\n🌱 Requo Demo Seeder\n");
  console.log("=" .repeat(50));

  // Phase 1: Reset
  await resetDatabase();

  // Phase 2: Seed each user
  const summary: Array<{
    email: string;
    plan: string;
    businesses: Array<{ name: string; slug: string; inquiries: number; quotes: number }>;
  }> = [];

  for (const userConfig of USERS) {
    console.log(`👤 Creating ${userConfig.plan.toUpperCase()} user: ${userConfig.email}`);

    // Create user via Better Auth
    const userId = await createUser(userConfig.name, userConfig.email);

    // Create workspace + subscription
    const wsId = await createWorkspace(userConfig, userId);
    console.log(`   Workspace: ${userConfig.workspaceName} (${userConfig.plan})`);

    // Create team members for this workspace
    if (userConfig.teamMembers) {
      for (const tm of userConfig.teamMembers) {
        const tmId = await createUser(tm.name, tm.email);
        await db.insert(workspaceMembers).values({
          id: id("wm"),
          workspaceId: wsId,
          userId: tmId,
          role: "member",
          createdAt: daysAgo(90),
          updatedAt: new Date(),
        });
        console.log(`   Team member: ${tm.email} (${tm.businessRole})`);
      }
    }

    const bizSummaries: typeof summary[0]["businesses"] = [];

    // Create businesses
    for (const bizConfig of userConfig.businesses) {
      const { businessId, formId } = await createBusiness(bizConfig, wsId, userId);

      // Add team members to this business
      if (userConfig.teamMembers) {
        for (const tm of userConfig.teamMembers) {
          // Look up user ID
          const [tmUser] = await db
            .select({ id: user.id })
            .from(user)
            .where(sql`${user.email} = ${tm.email}`)
            .limit(1);

          if (tmUser) {
            await db.insert(businessMembers).values({
              id: id("bm"),
              businessId,
              userId: tmUser.id,
              role: tm.businessRole,
              createdAt: daysAgo(90),
              updatedAt: new Date(),
            });
          }
        }
      }

      // Seed data
      console.log(`   📦 Business: ${bizConfig.name} — seeding ${bizConfig.inquiryCount} inquiries...`);
      const counts = await seedBusinessData(bizConfig, businessId, formId, userId);
      const isPrimaryDemoBusiness =
        bizConfig.slug === primaryDemoUser.businesses[0].slug;

      if (isPrimaryDemoBusiness) {
        await seedStableSmokeFixtures({
          businessId,
          formId,
          ownerId: userId,
        });
      }
      console.log(`      ✓ ${counts.inquiryCount} inquiries, ${counts.quoteCount} quotes, ${counts.quoteItemCount} line items`);

      bizSummaries.push({
        name: bizConfig.name,
        slug: bizConfig.slug,
        inquiries: counts.inquiryCount + (isPrimaryDemoBusiness ? 4 : 0),
        quotes: counts.quoteCount + (isPrimaryDemoBusiness ? 5 : 0),
      });
    }

    summary.push({ email: userConfig.email, plan: userConfig.plan, businesses: bizSummaries });
    console.log("");
  }

  await createUser("Casey Walker", demoOutsiderEmail);
  console.log(`   Extra user: ${demoOutsiderEmail} (no business access)\n`);

  // Phase 3: Summary
  console.log("=" .repeat(50));
  console.log("\n✅ Demo seed complete!\n");
  console.log("Login credentials:");
  console.log(`   Password (all users): ${PASSWORD}\n`);

  for (const s of summary) {
    const dashboardUrl = new URL(
      `/businesses/${s.businesses[0].slug}/dashboard`,
      env.BETTER_AUTH_URL,
    ).toString();

    console.log(`   [${s.plan.toUpperCase()}] ${s.email}`);

    for (const b of s.businesses) {
      console.log(`     ${b.name}: ${b.inquiries} inquiries, ${b.quotes} quotes`);
    }

    console.log(`     Dashboard: ${dashboardUrl}`);
    console.log("");
  }

  console.log("=" .repeat(50) + "\n");
}

main()
  .catch((error) => {
    console.error("❌ Failed to seed demo data.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await dbConnection.end({ timeout: 5 });
  });
