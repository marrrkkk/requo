import "dotenv/config";

import { and, asc, eq, inArray, ne } from "drizzle-orm";

import { auth } from "../lib/auth/config";
import { bootstrapWorkspaceForUser } from "../lib/auth/workspace-bootstrap";
import { db, dbConnection } from "../lib/db/client";
import {
  activityLogs,
  inquiries,
  inquiryNotes,
  knowledgeFaqs,
  profiles,
  quoteItems,
  quotes,
  user,
  workspaceMembers,
  workspaces,
} from "../lib/db/schema";
import { env } from "../lib/env";

type DemoUser = {
  id: string;
  email: string;
  name: string;
};

type DemoWorkspace = {
  id: string;
  name: string;
  slug: string;
};

const demoConfig = {
  ownerName: getSeedValue("DEMO_OWNER_NAME", "Morgan Lee"),
  ownerEmail: getSeedValue("DEMO_OWNER_EMAIL", "demo@relay.local").toLowerCase(),
  ownerPassword: getSeedValue("DEMO_OWNER_PASSWORD", "ChangeMe123456!"),
  workspaceName: getSeedValue("DEMO_WORKSPACE_NAME", "BrightSide Print Studio"),
  workspaceSlug: getSeedValue(
    "DEMO_WORKSPACE_SLUG",
    "brightside-print-studio",
  ),
};

const demoInquiryIds = [
  "demo_inquiry_new_storefront",
  "demo_inquiry_waiting_flyers",
  "demo_inquiry_quoted_booth_kit",
  "demo_inquiry_won_menu_bundle",
  "demo_inquiry_lost_merch_pack",
  "demo_inquiry_archived_refile",
] as const;

const demoQuoteIds = [
  "demo_quote_draft_1001",
  "demo_quote_sent_1002",
  "demo_quote_accepted_1003",
  "demo_quote_rejected_1004",
  "demo_quote_expired_1005",
] as const;

const demoQuotePublicTokens = [
  "demoquote1001drafttoken",
  getSeedValue("DEMO_QUOTE_PUBLIC_TOKEN", "demoquote1002senttoken"),
  "demoquote1003acceptedtoken",
  "demoquote1004rejectedtoken",
  getSeedValue("DEMO_EXPIRED_QUOTE_PUBLIC_TOKEN", "demoquote1005expiredtoken"),
] as const;

const demoQuoteItemIds = [
  "demo_quote_item_1001_a",
  "demo_quote_item_1001_b",
  "demo_quote_item_1002_a",
  "demo_quote_item_1002_b",
  "demo_quote_item_1003_a",
  "demo_quote_item_1003_b",
  "demo_quote_item_1004_a",
  "demo_quote_item_1004_b",
  "demo_quote_item_1005_a",
  "demo_quote_item_1005_b",
] as const;

const demoFaqIds = [
  "demo_faq_turnaround",
  "demo_faq_file_types",
  "demo_faq_revisions",
  "demo_faq_pickup_shipping",
] as const;

const demoNoteIds = [
  "demo_note_storefront",
  "demo_note_flyers",
  "demo_note_booth_kit",
  "demo_note_menu_bundle",
] as const;

const demoActivityIds = [
  "demo_activity_inquiry_new",
  "demo_activity_inquiry_waiting",
  "demo_activity_inquiry_quoted",
  "demo_activity_inquiry_won",
  "demo_activity_inquiry_lost",
  "demo_activity_quote_created_1001",
  "demo_activity_quote_created_1002",
  "demo_activity_quote_sent_1002",
  "demo_activity_quote_created_1003",
  "demo_activity_quote_accepted_1003",
  "demo_activity_quote_created_1004",
  "demo_activity_quote_rejected_1004",
  "demo_activity_quote_created_1005",
  "demo_activity_workspace_seeded",
] as const;

function getSeedValue(name: string, fallback: string) {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}

function daysAgo(days: number, hour = 10, minute = 0) {
  const date = new Date();
  date.setUTCHours(hour, minute, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function slugify(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return normalized || "workspace";
}

async function getAvailableSlug(baseSlug: string, currentWorkspaceId?: string) {
  const normalizedBaseSlug = slugify(baseSlug);
  let candidate = normalizedBaseSlug;
  let counter = 2;

  while (true) {
    const existing = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(
        currentWorkspaceId
          ? and(
              eq(workspaces.slug, candidate),
              ne(workspaces.id, currentWorkspaceId),
            )
          : eq(workspaces.slug, candidate),
      )
      .limit(1);

    if (!existing[0]) {
      return candidate;
    }

    candidate = `${normalizedBaseSlug}-${counter}`;
    counter += 1;
  }
}

async function ensureDemoUser(): Promise<DemoUser> {
  let [existingUser] = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
    })
    .from(user)
    .where(eq(user.email, demoConfig.ownerEmail))
    .limit(1);

  if (!existingUser) {
    await auth.api.signUpEmail({
      body: {
        name: demoConfig.ownerName,
        email: demoConfig.ownerEmail,
        password: demoConfig.ownerPassword,
      },
    });

    [existingUser] = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
      })
      .from(user)
      .where(eq(user.email, demoConfig.ownerEmail))
      .limit(1);
  }

  if (!existingUser) {
    throw new Error("Unable to create or load the demo owner user.");
  }

  const now = new Date();

  await db
    .update(user)
    .set({
      name: demoConfig.ownerName,
      updatedAt: now,
    })
    .where(eq(user.id, existingUser.id));

  await db
    .insert(profiles)
    .values({
      userId: existingUser.id,
      fullName: demoConfig.ownerName,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        fullName: demoConfig.ownerName,
        updatedAt: now,
      },
    });

  await bootstrapWorkspaceForUser({
    id: existingUser.id,
    name: demoConfig.ownerName,
    email: demoConfig.ownerEmail,
  });

  return {
    id: existingUser.id,
    email: existingUser.email,
    name: demoConfig.ownerName,
  };
}

async function ensureDemoWorkspace(demoUser: DemoUser): Promise<DemoWorkspace> {
  const [membership] = await db
    .select({
      workspaceId: workspaceMembers.workspaceId,
      role: workspaceMembers.role,
      workspaceName: workspaces.name,
      workspaceSlug: workspaces.slug,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(
      and(
        eq(workspaceMembers.userId, demoUser.id),
        eq(workspaceMembers.role, "owner"),
      ),
    )
    .orderBy(asc(workspaceMembers.createdAt))
    .limit(1);

  if (!membership) {
    throw new Error("The demo owner does not have an owner workspace.");
  }

  const now = new Date();
  const slug = await getAvailableSlug(
    demoConfig.workspaceSlug,
    membership.workspaceId,
  );

  await db
    .update(workspaces)
    .set({
      name: demoConfig.workspaceName,
      slug,
      shortDescription:
        "Neighborhood print production for storefront graphics, menus, flyers, and event materials.",
      contactEmail: demoUser.email,
      publicInquiryEnabled: true,
      inquiryHeadline:
        "Tell us what you need printed and we will turn it into a clean quote.",
      defaultEmailSignature: [
        demoConfig.ownerName,
        demoConfig.workspaceName,
        demoUser.email,
        "Same-week rush windows available when files are ready.",
      ].join("\n"),
      defaultQuoteNotes:
        "Prices include standard production. Installation, delivery, and rush changes are quoted separately when needed.",
      aiTonePreference: "warm",
      notifyOnNewInquiry: true,
      notifyOnQuoteSent: true,
      defaultCurrency: "USD",
      updatedAt: now,
    })
    .where(eq(workspaces.id, membership.workspaceId));

  return {
    id: membership.workspaceId,
    name: demoConfig.workspaceName,
    slug,
  };
}

async function seedWorkspaceData(demoUser: DemoUser, workspace: DemoWorkspace) {
  const noteTimestamps = {
    storefront: daysAgo(1, 14, 20),
    flyers: daysAgo(3, 11, 40),
    boothKit: daysAgo(6, 16, 15),
    menuBundle: daysAgo(10, 13, 5),
  };

  const inquiryRows = [
    {
      id: demoInquiryIds[0],
      workspaceId: workspace.id,
      status: "new" as const,
      subject: "New storefront window vinyl",
      customerName: "Olivia Park",
      customerEmail: "olivia@parkandpine.co",
      customerPhone: "(415) 555-0146",
      serviceCategory: "Window graphics",
      requestedDeadline: toIsoDate(daysFromNow(6)),
      budgetText: "$1,200 to $1,600",
      companyName: "Park & Pine",
      details:
        "We need front window vinyl for a weekend store refresh. Two large panels plus door hours decal. Looking for install timing and file setup guidance.",
      source: "demo-seed",
      quoteRequested: true,
      submittedAt: daysAgo(1, 9, 15),
      lastRespondedAt: null,
      createdAt: daysAgo(1, 9, 15),
      updatedAt: daysAgo(1, 9, 15),
    },
    {
      id: demoInquiryIds[1],
      workspaceId: workspace.id,
      status: "waiting" as const,
      subject: "Restaurant flyer drop",
      customerName: "Daniel Kim",
      customerEmail: "daniel@northforkkitchen.com",
      customerPhone: "(415) 555-0177",
      serviceCategory: "Flyers",
      requestedDeadline: toIsoDate(daysFromNow(10)),
      budgetText: "$300 to $500",
      companyName: "North Fork Kitchen",
      details:
        "Need 2,000 promotional flyers for a new lunch menu. We can provide art but may need help tightening the print-ready file. Waiting on exact paper preference.",
      source: "demo-seed",
      quoteRequested: true,
      submittedAt: daysAgo(3, 10, 30),
      lastRespondedAt: daysAgo(3, 12, 10),
      createdAt: daysAgo(3, 10, 30),
      updatedAt: daysAgo(3, 12, 10),
    },
    {
      id: demoInquiryIds[2],
      workspaceId: workspace.id,
      status: "quoted" as const,
      subject: "Trade show booth kit",
      customerName: "Priya Shah",
      customerEmail: "priya@foundrylabs.io",
      customerPhone: "(415) 555-0112",
      serviceCategory: "Event signage",
      requestedDeadline: toIsoDate(daysFromNow(14)),
      budgetText: "$2,500+",
      companyName: "Foundry Labs",
      details:
        "Need retractable banners, a branded table throw, and mounted foam board signs for a booth in two weeks. We already sent brand files and dimensions.",
      source: "demo-seed",
      quoteRequested: true,
      submittedAt: daysAgo(6, 8, 20),
      lastRespondedAt: daysAgo(5, 15, 0),
      createdAt: daysAgo(6, 8, 20),
      updatedAt: daysAgo(5, 15, 0),
    },
    {
      id: demoInquiryIds[3],
      workspaceId: workspace.id,
      status: "won" as const,
      subject: "Cafe menu board refresh",
      customerName: "Maya Chen",
      customerEmail: "maya@harborroast.com",
      customerPhone: "(415) 555-0109",
      serviceCategory: "Menus",
      requestedDeadline: toIsoDate(daysFromNow(4)),
      budgetText: "$800 to $1,100",
      companyName: "Harbor Roast",
      details:
        "Refreshing indoor menu boards and counter cards for a seasonal launch. Need help confirming substrate choices for a matte, easy-clean finish.",
      source: "demo-seed",
      quoteRequested: true,
      submittedAt: daysAgo(10, 9, 5),
      lastRespondedAt: daysAgo(8, 16, 35),
      createdAt: daysAgo(10, 9, 5),
      updatedAt: daysAgo(8, 16, 35),
    },
    {
      id: demoInquiryIds[4],
      workspaceId: workspace.id,
      status: "lost" as const,
      subject: "Team merch reorder",
      customerName: "Noah Bennett",
      customerEmail: "noah@rallyfit.co",
      customerPhone: null,
      serviceCategory: "Branded merchandise",
      requestedDeadline: null,
      budgetText: "$1,500",
      companyName: "RallyFit",
      details:
        "Requested a reorder of staff t-shirts and tote bags for a spring launch. Needed size breakdowns and final garment color approval before production.",
      source: "demo-seed",
      quoteRequested: true,
      submittedAt: daysAgo(17, 11, 25),
      lastRespondedAt: daysAgo(15, 14, 45),
      createdAt: daysAgo(17, 11, 25),
      updatedAt: daysAgo(15, 14, 45),
    },
    {
      id: demoInquiryIds[5],
      workspaceId: workspace.id,
      status: "archived" as const,
      subject: "Old menu reprint request",
      customerName: "Hector Ruiz",
      customerEmail: "hector@elmstreetdeli.com",
      customerPhone: "(415) 555-0189",
      serviceCategory: "Reprints",
      requestedDeadline: null,
      budgetText: null,
      companyName: "Elm Street Deli",
      details:
        "Requested a small menu reprint but stopped responding after the first reply. Keeping the record for reference only.",
      source: "demo-seed",
      quoteRequested: true,
      submittedAt: daysAgo(28, 10, 10),
      lastRespondedAt: daysAgo(27, 13, 0),
      createdAt: daysAgo(28, 10, 10),
      updatedAt: daysAgo(27, 13, 0),
    },
  ];

  const noteRows = [
    {
      id: demoNoteIds[0],
      workspaceId: workspace.id,
      inquiryId: demoInquiryIds[0],
      authorUserId: demoUser.id,
      body: "Customer sounds ready to move quickly. Ask for window dimensions and confirm whether installation should be quoted separately.",
      createdAt: noteTimestamps.storefront,
      updatedAt: noteTimestamps.storefront,
    },
    {
      id: demoNoteIds[1],
      workspaceId: workspace.id,
      inquiryId: demoInquiryIds[1],
      authorUserId: demoUser.id,
      body: "Waiting on paper stock preference and whether they want local pickup or courier delivery.",
      createdAt: noteTimestamps.flyers,
      updatedAt: noteTimestamps.flyers,
    },
    {
      id: demoNoteIds[2],
      workspaceId: workspace.id,
      inquiryId: demoInquiryIds[2],
      authorUserId: demoUser.id,
      body: "Files received. Banner hardware options might change cost range, so keep the reply specific but do not lock pricing until finish options are confirmed.",
      createdAt: noteTimestamps.boothKit,
      updatedAt: noteTimestamps.boothKit,
    },
    {
      id: demoNoteIds[3],
      workspaceId: workspace.id,
      inquiryId: demoInquiryIds[3],
      authorUserId: demoUser.id,
      body: "Customer approved the matte rigid board recommendation and requested install-ready mounting hardware.",
      createdAt: noteTimestamps.menuBundle,
      updatedAt: noteTimestamps.menuBundle,
    },
  ];

  const faqRows = [
    {
      id: demoFaqIds[0],
      workspaceId: workspace.id,
      question: "What is your normal turnaround time?",
      answer:
        "Standard print jobs usually ship or are ready for pickup within 3 to 5 business days after artwork approval. Rush timing depends on file readiness and production load.",
      position: 0,
      createdAt: daysAgo(30, 9, 0),
      updatedAt: daysAgo(30, 9, 0),
    },
    {
      id: demoFaqIds[1],
      workspaceId: workspace.id,
      question: "Which files should customers send?",
      answer:
        "Preferred files are press-ready PDF, AI, or SVG. High-resolution PNG can work for some jobs. If files are not print-ready, we can review them before quoting final production.",
      position: 1,
      createdAt: daysAgo(29, 9, 0),
      updatedAt: daysAgo(29, 9, 0),
    },
    {
      id: demoFaqIds[2],
      workspaceId: workspace.id,
      question: "Do you include revisions in the quote?",
      answer:
        "Quotes normally include one practical round of production adjustments. Larger redesign work or repeated revision rounds are quoted separately once scope is clear.",
      position: 2,
      createdAt: daysAgo(28, 9, 0),
      updatedAt: daysAgo(28, 9, 0),
    },
    {
      id: demoFaqIds[3],
      workspaceId: workspace.id,
      question: "Do you offer pickup, delivery, or installation?",
      answer:
        "Pickup is available during business hours. Local delivery and installation can be quoted when timing, address, and install conditions are confirmed.",
      position: 3,
      createdAt: daysAgo(27, 9, 0),
      updatedAt: daysAgo(27, 9, 0),
    },
  ];

  const quoteRows = [
    {
      id: demoQuoteIds[0],
      workspaceId: workspace.id,
      inquiryId: null,
      status: "draft" as const,
      quoteNumber: "Q-1001",
      publicToken: demoQuotePublicTokens[0],
      title: "Seasonal sidewalk sign refresh",
      customerName: "Jamie Torres",
      customerEmail: "jamie@cedarandlane.co",
      currency: "USD",
      notes:
        "Draft quote prepared from a walk-in conversation. Final scope still depends on hardware preference and weather-resistant finish.",
      subtotalInCents: 97000,
      discountInCents: 5000,
      totalInCents: 92000,
      sentAt: null,
      acceptedAt: null,
      publicViewedAt: null,
      customerRespondedAt: null,
      customerResponseMessage: null,
      validUntil: toIsoDate(daysFromNow(14)),
      createdAt: daysAgo(2, 15, 15),
      updatedAt: daysAgo(2, 15, 15),
    },
    {
      id: demoQuoteIds[1],
      workspaceId: workspace.id,
      inquiryId: demoInquiryIds[2],
      status: "sent" as const,
      quoteNumber: "Q-1002",
      publicToken: demoQuotePublicTokens[1],
      title: "Foundry Labs booth kit",
      customerName: "Priya Shah",
      customerEmail: "priya@foundrylabs.io",
      currency: "USD",
      notes:
        "Includes retractable banner hardware, table throw production, and mounted event signage. Shipping timing depends on final file approval date.",
      subtotalInCents: 286000,
      discountInCents: 10000,
      totalInCents: 276000,
      sentAt: daysAgo(5, 15, 0),
      acceptedAt: null,
      publicViewedAt: daysAgo(4, 10, 20),
      customerRespondedAt: null,
      customerResponseMessage: null,
      validUntil: toIsoDate(daysFromNow(9)),
      createdAt: daysAgo(6, 15, 0),
      updatedAt: daysAgo(5, 15, 0),
    },
    {
      id: demoQuoteIds[2],
      workspaceId: workspace.id,
      inquiryId: demoInquiryIds[3],
      status: "accepted" as const,
      quoteNumber: "Q-1003",
      publicToken: demoQuotePublicTokens[2],
      title: "Harbor Roast menu board package",
      customerName: "Maya Chen",
      customerEmail: "maya@harborroast.com",
      currency: "USD",
      notes:
        "Accepted package includes menu boards, counter cards, and mounting hardware. Install scheduling is coordinated separately.",
      subtotalInCents: 112000,
      discountInCents: 7000,
      totalInCents: 105000,
      sentAt: daysAgo(9, 10, 0),
      acceptedAt: daysAgo(8, 16, 35),
      publicViewedAt: daysAgo(8, 15, 50),
      customerRespondedAt: daysAgo(8, 16, 35),
      customerResponseMessage:
        "Looks good. Please move ahead with production and send the install timing.",
      validUntil: toIsoDate(daysFromNow(5)),
      createdAt: daysAgo(10, 10, 0),
      updatedAt: daysAgo(8, 16, 35),
    },
    {
      id: demoQuoteIds[3],
      workspaceId: workspace.id,
      inquiryId: demoInquiryIds[4],
      status: "rejected" as const,
      quoteNumber: "Q-1004",
      publicToken: demoQuotePublicTokens[3],
      title: "RallyFit merch reorder",
      customerName: "Noah Bennett",
      customerEmail: "noah@rallyfit.co",
      currency: "USD",
      notes:
        "Quote covered garment sourcing, printing, and packing by size run. Customer paused after comparing alternate suppliers.",
      subtotalInCents: 158000,
      discountInCents: 8000,
      totalInCents: 150000,
      sentAt: daysAgo(16, 12, 0),
      acceptedAt: null,
      publicViewedAt: daysAgo(15, 13, 10),
      customerRespondedAt: daysAgo(15, 14, 45),
      customerResponseMessage:
        "Thanks, but we decided to consolidate this reorder with another supplier.",
      validUntil: toIsoDate(daysAgo(2)),
      createdAt: daysAgo(17, 12, 0),
      updatedAt: daysAgo(15, 14, 45),
    },
    {
      id: demoQuoteIds[4],
      workspaceId: workspace.id,
      inquiryId: null,
      status: "expired" as const,
      quoteNumber: "Q-1005",
      publicToken: demoQuotePublicTokens[4],
      title: "Summer banner restock",
      customerName: "Leah Morris",
      customerEmail: "leah@madeandmain.com",
      currency: "USD",
      notes:
        "Quote expired after artwork approval stalled. Can be reopened if file specs are confirmed again.",
      subtotalInCents: 64000,
      discountInCents: 0,
      totalInCents: 64000,
      sentAt: daysAgo(22, 11, 0),
      acceptedAt: null,
      publicViewedAt: daysAgo(21, 9, 40),
      customerRespondedAt: null,
      customerResponseMessage: null,
      validUntil: toIsoDate(daysAgo(10)),
      createdAt: daysAgo(23, 11, 0),
      updatedAt: daysAgo(22, 11, 0),
    },
  ];

  const quoteItemRows = [
    {
      id: demoQuoteItemIds[0],
      workspaceId: workspace.id,
      quoteId: demoQuoteIds[0],
      description: "A-frame sign panel production",
      quantity: 2,
      unitPriceInCents: 28000,
      lineTotalInCents: 56000,
      position: 0,
      createdAt: daysAgo(2, 15, 15),
      updatedAt: daysAgo(2, 15, 15),
    },
    {
      id: demoQuoteItemIds[1],
      workspaceId: workspace.id,
      quoteId: demoQuoteIds[0],
      description: "Weather-laminate finishing and install kit",
      quantity: 1,
      unitPriceInCents: 41000,
      lineTotalInCents: 41000,
      position: 1,
      createdAt: daysAgo(2, 15, 16),
      updatedAt: daysAgo(2, 15, 16),
    },
    {
      id: demoQuoteItemIds[2],
      workspaceId: workspace.id,
      quoteId: demoQuoteIds[1],
      description: "Retractable banner kit",
      quantity: 2,
      unitPriceInCents: 62000,
      lineTotalInCents: 124000,
      position: 0,
      createdAt: daysAgo(6, 15, 0),
      updatedAt: daysAgo(6, 15, 0),
    },
    {
      id: demoQuoteItemIds[3],
      workspaceId: workspace.id,
      quoteId: demoQuoteIds[1],
      description: "Table throw and mounted booth signage",
      quantity: 1,
      unitPriceInCents: 162000,
      lineTotalInCents: 162000,
      position: 1,
      createdAt: daysAgo(6, 15, 1),
      updatedAt: daysAgo(6, 15, 1),
    },
    {
      id: demoQuoteItemIds[4],
      workspaceId: workspace.id,
      quoteId: demoQuoteIds[2],
      description: "Rigid menu board set",
      quantity: 3,
      unitPriceInCents: 24000,
      lineTotalInCents: 72000,
      position: 0,
      createdAt: daysAgo(10, 10, 0),
      updatedAt: daysAgo(10, 10, 0),
    },
    {
      id: demoQuoteItemIds[5],
      workspaceId: workspace.id,
      quoteId: demoQuoteIds[2],
      description: "Counter cards and mounting hardware",
      quantity: 1,
      unitPriceInCents: 40000,
      lineTotalInCents: 40000,
      position: 1,
      createdAt: daysAgo(10, 10, 1),
      updatedAt: daysAgo(10, 10, 1),
    },
    {
      id: demoQuoteItemIds[6],
      workspaceId: workspace.id,
      quoteId: demoQuoteIds[3],
      description: "Staff t-shirt print run",
      quantity: 40,
      unitPriceInCents: 2500,
      lineTotalInCents: 100000,
      position: 0,
      createdAt: daysAgo(17, 12, 0),
      updatedAt: daysAgo(17, 12, 0),
    },
    {
      id: demoQuoteItemIds[7],
      workspaceId: workspace.id,
      quoteId: demoQuoteIds[3],
      description: "Branded tote bags",
      quantity: 25,
      unitPriceInCents: 2320,
      lineTotalInCents: 58000,
      position: 1,
      createdAt: daysAgo(17, 12, 1),
      updatedAt: daysAgo(17, 12, 1),
    },
    {
      id: demoQuoteItemIds[8],
      workspaceId: workspace.id,
      quoteId: demoQuoteIds[4],
      description: "Outdoor banner production",
      quantity: 4,
      unitPriceInCents: 14000,
      lineTotalInCents: 56000,
      position: 0,
      createdAt: daysAgo(23, 11, 0),
      updatedAt: daysAgo(23, 11, 0),
    },
    {
      id: demoQuoteItemIds[9],
      workspaceId: workspace.id,
      quoteId: demoQuoteIds[4],
      description: "Reinforced grommets and finishing",
      quantity: 1,
      unitPriceInCents: 8000,
      lineTotalInCents: 8000,
      position: 1,
      createdAt: daysAgo(23, 11, 1),
      updatedAt: daysAgo(23, 11, 1),
    },
  ];

  const activityRows = [
    {
      id: demoActivityIds[0],
      workspaceId: workspace.id,
      inquiryId: demoInquiryIds[0],
      quoteId: null,
      actorUserId: demoUser.id,
      type: "inquiry.received",
      summary: "New storefront inquiry received from Park & Pine.",
      metadata: { source: "demo-seed" },
      createdAt: daysAgo(1, 9, 15),
      updatedAt: daysAgo(1, 9, 15),
    },
    {
      id: demoActivityIds[1],
      workspaceId: workspace.id,
      inquiryId: demoInquiryIds[1],
      quoteId: null,
      actorUserId: demoUser.id,
      type: "inquiry.status_changed",
      summary: "Inquiry moved to waiting while paper stock details are confirmed.",
      metadata: { source: "demo-seed", nextStatus: "waiting" },
      createdAt: daysAgo(3, 12, 10),
      updatedAt: daysAgo(3, 12, 10),
    },
    {
      id: demoActivityIds[2],
      workspaceId: workspace.id,
      inquiryId: demoInquiryIds[2],
      quoteId: null,
      actorUserId: demoUser.id,
      type: "inquiry.status_changed",
      summary: "Inquiry moved to quoted after the booth kit estimate was prepared.",
      metadata: { source: "demo-seed", nextStatus: "quoted" },
      createdAt: daysAgo(5, 15, 0),
      updatedAt: daysAgo(5, 15, 0),
    },
    {
      id: demoActivityIds[3],
      workspaceId: workspace.id,
      inquiryId: demoInquiryIds[3],
      quoteId: null,
      actorUserId: demoUser.id,
      type: "inquiry.status_changed",
      summary: "Inquiry moved to won after the menu board quote was accepted.",
      metadata: { source: "demo-seed", nextStatus: "won" },
      createdAt: daysAgo(8, 16, 35),
      updatedAt: daysAgo(8, 16, 35),
    },
    {
      id: demoActivityIds[4],
      workspaceId: workspace.id,
      inquiryId: demoInquiryIds[4],
      quoteId: null,
      actorUserId: demoUser.id,
      type: "inquiry.status_changed",
      summary: "Inquiry marked lost after the customer selected another supplier.",
      metadata: { source: "demo-seed", nextStatus: "lost" },
      createdAt: daysAgo(15, 14, 45),
      updatedAt: daysAgo(15, 14, 45),
    },
    {
      id: demoActivityIds[5],
      workspaceId: workspace.id,
      inquiryId: null,
      quoteId: demoQuoteIds[0],
      actorUserId: demoUser.id,
      type: "quote.created",
      summary: "Draft quote Q-1001 created from a manual request.",
      metadata: { source: "demo-seed" },
      createdAt: daysAgo(2, 15, 15),
      updatedAt: daysAgo(2, 15, 15),
    },
    {
      id: demoActivityIds[6],
      workspaceId: workspace.id,
      inquiryId: demoInquiryIds[2],
      quoteId: demoQuoteIds[1],
      actorUserId: demoUser.id,
      type: "quote.created",
      summary: "Quote Q-1002 prepared for the Foundry Labs booth kit.",
      metadata: { source: "demo-seed" },
      createdAt: daysAgo(6, 15, 0),
      updatedAt: daysAgo(6, 15, 0),
    },
    {
      id: demoActivityIds[7],
      workspaceId: workspace.id,
      inquiryId: demoInquiryIds[2],
      quoteId: demoQuoteIds[1],
      actorUserId: demoUser.id,
      type: "quote.sent",
      summary: "Quote Q-1002 sent to Priya Shah.",
      metadata: { source: "demo-seed" },
      createdAt: daysAgo(5, 15, 0),
      updatedAt: daysAgo(5, 15, 0),
    },
    {
      id: demoActivityIds[8],
      workspaceId: workspace.id,
      inquiryId: demoInquiryIds[3],
      quoteId: demoQuoteIds[2],
      actorUserId: demoUser.id,
      type: "quote.created",
      summary: "Quote Q-1003 created for the Harbor Roast menu refresh.",
      metadata: { source: "demo-seed" },
      createdAt: daysAgo(10, 10, 0),
      updatedAt: daysAgo(10, 10, 0),
    },
    {
      id: demoActivityIds[9],
      workspaceId: workspace.id,
      inquiryId: demoInquiryIds[3],
      quoteId: demoQuoteIds[2],
      actorUserId: demoUser.id,
      type: "quote.status_changed",
      summary: "Quote Q-1003 marked accepted.",
      metadata: { source: "demo-seed", nextStatus: "accepted" },
      createdAt: daysAgo(8, 16, 35),
      updatedAt: daysAgo(8, 16, 35),
    },
    {
      id: demoActivityIds[10],
      workspaceId: workspace.id,
      inquiryId: demoInquiryIds[4],
      quoteId: demoQuoteIds[3],
      actorUserId: demoUser.id,
      type: "quote.created",
      summary: "Quote Q-1004 created for the RallyFit merch reorder.",
      metadata: { source: "demo-seed" },
      createdAt: daysAgo(17, 12, 0),
      updatedAt: daysAgo(17, 12, 0),
    },
    {
      id: demoActivityIds[11],
      workspaceId: workspace.id,
      inquiryId: demoInquiryIds[4],
      quoteId: demoQuoteIds[3],
      actorUserId: demoUser.id,
      type: "quote.status_changed",
      summary: "Quote Q-1004 marked rejected after the customer chose another vendor.",
      metadata: { source: "demo-seed", nextStatus: "rejected" },
      createdAt: daysAgo(15, 14, 45),
      updatedAt: daysAgo(15, 14, 45),
    },
    {
      id: demoActivityIds[12],
      workspaceId: workspace.id,
      inquiryId: null,
      quoteId: demoQuoteIds[4],
      actorUserId: demoUser.id,
      type: "quote.created",
      summary: "Quote Q-1005 created and later left to expire.",
      metadata: { source: "demo-seed" },
      createdAt: daysAgo(23, 11, 0),
      updatedAt: daysAgo(23, 11, 0),
    },
    {
      id: demoActivityIds[13],
      workspaceId: workspace.id,
      inquiryId: null,
      quoteId: null,
      actorUserId: demoUser.id,
      type: "workspace.demo_seeded",
      summary: "Sample Relay MVP data refreshed for local setup.",
      metadata: { source: "demo-seed" },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  await db.transaction(async (tx) => {
    await tx.delete(activityLogs).where(inArray(activityLogs.id, demoActivityIds));
    await tx.delete(inquiryNotes).where(inArray(inquiryNotes.id, demoNoteIds));
    await tx.delete(quoteItems).where(inArray(quoteItems.id, demoQuoteItemIds));
    await tx.delete(quotes).where(inArray(quotes.id, demoQuoteIds));
    await tx.delete(inquiries).where(inArray(inquiries.id, demoInquiryIds));
    await tx.delete(knowledgeFaqs).where(inArray(knowledgeFaqs.id, demoFaqIds));

    await tx.insert(knowledgeFaqs).values(faqRows);
    await tx.insert(inquiries).values(inquiryRows);
    await tx.insert(inquiryNotes).values(noteRows);
    await tx.insert(quotes).values(quoteRows);
    await tx.insert(quoteItems).values(quoteItemRows);
    await tx.insert(activityLogs).values(activityRows);
  });
}

async function main() {
  const demoUser = await ensureDemoUser();
  const workspace = await ensureDemoWorkspace(demoUser);

  await seedWorkspaceData(demoUser, workspace);

  const dashboardUrl = new URL("/dashboard", env.BETTER_AUTH_URL).toString();
  const inquiryUrl = new URL(
    `/inquire/${workspace.slug}`,
    env.BETTER_AUTH_URL,
  ).toString();

  console.log("");
  console.log("Relay demo data seeded.");
  console.log(`Workspace: ${workspace.name}`);
  console.log(`Workspace slug: ${workspace.slug}`);
  console.log(`Demo owner email: ${demoUser.email}`);
  console.log(`Demo owner password: ${demoConfig.ownerPassword}`);
  console.log(`Dashboard URL: ${dashboardUrl}`);
  console.log(`Public inquiry URL: ${inquiryUrl}`);
  console.log("");
  console.log(
    "The script refreshes the fixed demo records for the demo workspace without touching other workspaces.",
  );
}

main()
  .catch((error) => {
    console.error("Failed to seed Relay demo data.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await dbConnection.end({ timeout: 5 });
  });
