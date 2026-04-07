import "dotenv/config";

import { and, asc, eq, inArray, ne } from "drizzle-orm";

import { createInquiryFormPreset } from "../features/inquiries/inquiry-forms";
import { auth } from "../lib/auth/config";
import { bootstrapBusinessForUser } from "../lib/auth/business-bootstrap";
import { db, dbConnection } from "../lib/db/client";
import {
  activityLogs,
  inquiries,
  inquiryNotes,
  knowledgeFaqs,
  profiles,
  quoteItems,
  quotes,
  replySnippets,
  user,
  businessInquiryForms,
  businessMembers,
  businesses,
} from "../lib/db/schema";
import { env } from "../lib/env";

type DemoUser = {
  id: string;
  email: string;
  name: string;
};

type DemoBusiness = {
  id: string;
  name: string;
  slug: string;
  defaultInquiryFormId: string;
};

const demoConfig = {
  ownerName: getSeedValue("DEMO_OWNER_NAME", "Morgan Lee"),
  ownerEmail: getSeedValue("DEMO_OWNER_EMAIL", "demo@requo.local").toLowerCase(),
  ownerPassword: getSeedValue("DEMO_OWNER_PASSWORD", "ChangeMe123456!"),
  businessName: getSeedValue("DEMO_BUSINESS_NAME", "BrightSide Print Studio"),
  businessSlug: getSeedValue(
    "DEMO_BUSINESS_SLUG",
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
  "demo_inquiry_history_foundry_rebrand",
] as const;

const demoQuoteIds = [
  "demo_quote_draft_1001",
  "demo_quote_sent_1002",
  "demo_quote_accepted_1003",
  "demo_quote_rejected_1004",
  "demo_quote_expired_1005",
  "demo_quote_history_0998",
] as const;

const demoQuotePublicTokens = [
  "demoquote1001drafttoken",
  getSeedValue("DEMO_QUOTE_PUBLIC_TOKEN", "demoquote1002senttoken"),
  "demoquote1003acceptedtoken",
  "demoquote1004rejectedtoken",
  getSeedValue("DEMO_EXPIRED_QUOTE_PUBLIC_TOKEN", "demoquote1005expiredtoken"),
  "demoquote0998historytoken",
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
  "demo_quote_item_0998_a",
  "demo_quote_item_0998_b",
] as const;

const demoReplySnippetIds = [
  "demo_reply_snippet_dimensions",
  "demo_reply_snippet_timeline",
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
  "demo_activity_inquiry_history_foundry",
  "demo_activity_quote_created_0998",
  "demo_activity_quote_post_acceptance_0998",
  "demo_activity_business_seeded",
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

  return normalized || "business";
}

async function getAvailableSlug(baseSlug: string, currentBusinessId?: string) {
  const normalizedBaseSlug = slugify(baseSlug);
  let candidate = normalizedBaseSlug;
  let counter = 2;

  while (true) {
    const existing = await db
      .select({ id: businesses.id })
      .from(businesses)
      .where(
        currentBusinessId
          ? and(
              eq(businesses.slug, candidate),
              ne(businesses.id, currentBusinessId),
            )
          : eq(businesses.slug, candidate),
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

  await bootstrapBusinessForUser({
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

async function ensureDemoBusiness(demoUser: DemoUser): Promise<DemoBusiness> {
  const [membership] = await db
    .select({
      businessId: businessMembers.businessId,
      role: businessMembers.role,
      businessName: businesses.name,
      businessSlug: businesses.slug,
    })
    .from(businessMembers)
    .innerJoin(businesses, eq(businessMembers.businessId, businesses.id))
    .where(
      and(
        eq(businessMembers.userId, demoUser.id),
        eq(businessMembers.role, "owner"),
      ),
    )
    .orderBy(asc(businessMembers.createdAt))
    .limit(1);

  if (!membership) {
    throw new Error("The demo owner does not have an owner business.");
  }

  const now = new Date();
  const slug = await getAvailableSlug(
    demoConfig.businessSlug,
    membership.businessId,
  );
  const inquiryPreset = createInquiryFormPreset({
    businessType: "print_signage",
    businessName: demoConfig.businessName,
  });

  await db
    .update(businesses)
    .set({
      name: demoConfig.businessName,
      slug,
      businessType: "print_signage",
      shortDescription:
        "Neighborhood print production for storefront graphics, menus, flyers, and event materials.",
      contactEmail: demoUser.email,
      publicInquiryEnabled: true,
      inquiryHeadline:
        "Tell us what you need printed and we will turn it into a clean quote.",
      defaultEmailSignature: [
        demoConfig.ownerName,
        demoConfig.businessName,
        demoUser.email,
        "Same-week rush windows available when files are ready.",
      ].join("\n"),
      defaultQuoteNotes:
        "Prices include standard production. Installation, delivery, and rush changes are quoted separately when needed.",
      aiTonePreference: "warm",
      notifyOnNewInquiry: true,
      notifyOnQuoteSent: true,
      notifyOnQuoteResponse: true,
      notifyInAppOnNewInquiry: true,
      notifyInAppOnQuoteResponse: true,
      defaultCurrency: "USD",
      updatedAt: now,
    })
    .where(eq(businesses.id, membership.businessId));

  const [defaultForm] = await db
    .select({
      id: businessInquiryForms.id,
    })
    .from(businessInquiryForms)
    .where(
      and(
        eq(businessInquiryForms.businessId, membership.businessId),
        eq(businessInquiryForms.isDefault, true),
      ),
    )
    .limit(1);

  if (!defaultForm) {
    throw new Error("The demo business does not have a default inquiry form.");
  }

  await db
    .update(businessInquiryForms)
    .set({
      name: inquiryPreset.name,
      slug: inquiryPreset.slug,
      businessType: inquiryPreset.businessType,
      publicInquiryEnabled: true,
      inquiryFormConfig: inquiryPreset.inquiryFormConfig,
      inquiryPageConfig: inquiryPreset.inquiryPageConfig,
      updatedAt: now,
    })
    .where(eq(businessInquiryForms.id, defaultForm.id));

  return {
    id: membership.businessId,
    name: demoConfig.businessName,
    slug,
    defaultInquiryFormId: defaultForm.id,
  };
}

async function generateBulkInquiries(
  businessId: string,
  formId: string,
  demoUserId: string,
  count: number,
): Promise<
  Array<{
    id: string;
    businessId: string;
    businessInquiryFormId: string;
    status: string;
    subject: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string | null;
    serviceCategory: string;
    requestedDeadline: string | null;
    budgetText: string | null;
    companyName: string | null;
    details: string;
    source: string;
    quoteRequested: boolean;
    submittedAt: Date;
    lastRespondedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>
> {
  const serviceCategories = [
    "Window graphics",
    "Business cards",
    "Flyers",
    "Event signage",
    "Menus",
    "Labels & stickers",
    "Branded merchandise",
    "Banners & signage",
    "Postcards",
    "Brochures",
    "Packaging",
    "Promotional items",
  ];

  const statuses = ["new", "waiting", "quoted", "won", "lost", "archived"];
  const firstNames = [
    "James",
    "Mary",
    "Robert",
    "Patricia",
    "Michael",
    "Jennifer",
    "William",
    "Linda",
    "David",
    "Barbara",
    "Richard",
    "Elizabeth",
    "Sarah",
    "Priya",
    "Carlos",
    "Amelia",
    "Zhang",
    "Fatima",
    "Kowalski",
    "O'Brien",
  ];
  const lastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
    "Miller",
    "Davis",
    "Rodriguez",
    "Martinez",
    "Hernandez",
    "Lopez",
    "Gonzalez",
    "Wilson",
    "Anderson",
    "Thomas",
    "Taylor",
    "Moore",
    "Jackson",
    "Martin",
  ];
  const companyNames = [
    "Studio Co",
    "Creative Works",
    "Brand Lab",
    "Design House",
    "The Workshop",
    "Print Pro",
    "Sign Masters",
    "Graphics Plus",
    "Label Art",
    "Promo Hub",
    "Merchandise Co",
    "Banner Works",
    "Branding Studio",
    "Marketing Plus",
    "Media Group",
    "Visual Arts",
    "Creative Hub",
    "Design Studio",
    "Print Services",
    "Graphic Arts",
  ];

  const details = [
    "We need this as soon as possible. Can you provide a quick turnaround estimate?",
    "Looking for high-quality production and good pricing. Please provide your best quote.",
    "This is a recurring project for us, so we're looking to establish a long-term partnership.",
    "Our current vendor is overbooked. Can you help us meet our deadline?",
    "We want to refresh our branding materials. What options do you recommend?",
    "Budget is flexible if the quality matches our brand standards.",
    "We're flexible on timeline but need the best quality possible.",
    "First-time order, but we have a good sense of what we need.",
    "This is urgent. Our event is in two weeks.",
    "We've heard great things about your work. Looking forward to collaborating.",
  ];

  const budgets = [
    "$100-$250",
    "$250-$500",
    "$500-$1000",
    "$1000-$2500",
    "$2500-$5000",
    "$5000+",
    null,
  ];

  const inquiries = [];

  for (let i = 0; i < count; i++) {
    const firstName =
      firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const company =
      companyNames[Math.floor(Math.random() * companyNames.length)];
    const category =
      serviceCategories[Math.floor(Math.random() * serviceCategories.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const budget = budgets[Math.floor(Math.random() * budgets.length)];
    const detail = details[Math.floor(Math.random() * details.length)];
    const daysAgoValue = Math.floor(Math.random() * 90);
    const submittedDate = daysAgo(daysAgoValue, 9 + Math.floor(Math.random() * 8));

    inquiries.push({
      id: `bulk_inquiry_${count}_${i}`,
      businessId,
      businessInquiryFormId: formId,
      status,
      subject: `${category} request from ${company}`,
      customerName: `${firstName} ${lastName}`,
      customerEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.toLowerCase().replace(/\s+/g, "")}.com`.slice(
        0,
        254,
      ),
      customerPhone:
        Math.random() > 0.3 ? `(${Math.floor(Math.random() * 900) + 100}) 555-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}` : null,
      serviceCategory: category,
      requestedDeadline:
        Math.random() > 0.4
          ? toIsoDate(daysFromNow(Math.floor(Math.random() * 30) + 3))
          : null,
      budgetText: budget,
      companyName: company,
      details: detail,
      source: "demo-seed-bulk",
      quoteRequested: true,
      submittedAt: submittedDate,
      lastRespondedAt:
        status === "new"
          ? null
          : daysAgo(Math.max(0, daysAgoValue - Math.floor(Math.random() * daysAgoValue))),
      createdAt: submittedDate,
      updatedAt: submittedDate,
    });
  }

  return inquiries;
}

async function generateBulkQuotes(
  businessId: string,
  inquiries: Array<{ id: string; status: string }>,
) {
  const quotes = [];
  let quoteNumber = 2001;

  for (const inquiry of inquiries) {
    if (
      (inquiry.status === "quoted" ||
        inquiry.status === "won" ||
        inquiry.status === "lost") &&
      Math.random() > 0.2
    ) {
      const statusMap: Record<string, string> = {
        quoted: "draft",
        won: "accepted",
        lost: "rejected",
      };
      const quoteStatus =
        inquiry.status === "quoted"
          ? "draft"
          : inquiry.status === "won"
            ? "accepted"
            : "rejected";

      const now = new Date();
      const createdDaysAgo = Math.floor(Math.random() * 60);
      const createdDate = daysAgo(createdDaysAgo);
      const sentDaysAgo =
        quoteStatus === "draft" ? null : createdDaysAgo - Math.floor(Math.random() * 7);
      const sentDate = sentDaysAgo ? daysAgo(sentDaysAgo) : null;

      const subtotal = Math.floor(Math.random() * 450000) + 5000;
      const discount = Math.floor(subtotal * (Math.random() * 0.15));
      const total = subtotal - discount;

      quotes.push({
        id: `bulk_quote_${inquiry.id}`,
        businessId,
        inquiryId: inquiry.id,
        status: quoteStatus,
        quoteNumber: `Q-${quoteNumber}`,
        publicToken: `token_${quoteNumber}_${Date.now()}`,
        title: `Quote for ${inquiry.id}`,
        customerName: "Bulk Customer",
        customerEmail: "customer@example.com",
        currency: "USD",
        notes: "Bulk generated quote for demo purposes.",
        subtotalInCents: subtotal,
        discountInCents: discount,
        totalInCents: total,
        sentAt: sentDate,
        acceptedAt:
          quoteStatus === "accepted"
            ? daysAgo(Math.floor(Math.random() * createdDaysAgo))
            : null,
        publicViewedAt: sentDate
          ? daysAgo(
              Math.max(0, sentDaysAgo - Math.floor(Math.random() * sentDaysAgo)),
            )
          : null,
        customerRespondedAt:
          quoteStatus !== "draft"
            ? daysAgo(Math.max(0, createdDaysAgo - Math.floor(Math.random() * 10)))
            : null,
        customerResponseMessage:
          quoteStatus === "accepted"
            ? "Approved. Please proceed."
            : quoteStatus === "rejected"
              ? "Thanks but we chose another vendor."
              : null,
        postAcceptanceStatus: "none" as const,
        validUntil: toIsoDate(daysFromNow(30)),
        createdAt: createdDate,
        updatedAt: sentDate || createdDate,
      });

      quoteNumber++;
    }
  }

  return quotes;
}

async function generateBulkQuoteItems(
  businessId: string,
  quotes: Array<{ id: string }>,
) {
  const items = [];
  const descriptions = [
    "Production and printing",
    "Design and setup",
    "Finishing and binding",
    "Quality assurance",
    "Packaging and shipping",
    "Rush surcharge",
    "Material upgrade",
    "Special finishing",
  ];

  for (const quote of quotes) {
    const itemCount = Math.floor(Math.random() * 4) + 1;
    for (let i = 0; i < itemCount; i++) {
      items.push({
        id: `bulk_item_${quote.id}_${i}`,
        businessId,
        quoteId: quote.id,
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
        quantity: Math.floor(Math.random() * 100) + 1,
        unitPriceInCents: Math.floor(Math.random() * 50000) + 1000,
        lineTotalInCents: 0,
        position: i,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  return items;
}

async function seedBusinessData(demoUser: DemoUser, business: DemoBusiness) {
  const noteTimestamps = {
    storefront: daysAgo(1, 14, 20),
    flyers: daysAgo(3, 11, 40),
    boothKit: daysAgo(6, 16, 15),
    menuBundle: daysAgo(10, 13, 5),
  };

  const inquiryRows = [
    {
      id: demoInquiryIds[0],
      businessId: business.id,
      businessInquiryFormId: business.defaultInquiryFormId,
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
      businessId: business.id,
      businessInquiryFormId: business.defaultInquiryFormId,
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
      businessId: business.id,
      businessInquiryFormId: business.defaultInquiryFormId,
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
      businessId: business.id,
      businessInquiryFormId: business.defaultInquiryFormId,
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
      businessId: business.id,
      businessInquiryFormId: business.defaultInquiryFormId,
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
      businessId: business.id,
      businessInquiryFormId: business.defaultInquiryFormId,
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
    {
      id: demoInquiryIds[6],
      businessId: business.id,
      businessInquiryFormId: business.defaultInquiryFormId,
      status: "won" as const,
      subject: "Foundry Labs rebrand signage",
      customerName: "Priya Shah",
      customerEmail: "priya@foundrylabs.io",
      customerPhone: "(415) 555-0112",
      serviceCategory: "Office signage",
      requestedDeadline: null,
      budgetText: "$3,000+",
      companyName: "Foundry Labs",
      details:
        "Previous project for a small office rebrand package including lobby graphics and door signs. Completed successfully last quarter.",
      source: "demo-seed",
      quoteRequested: true,
      submittedAt: daysAgo(42, 9, 20),
      lastRespondedAt: daysAgo(35, 15, 30),
      createdAt: daysAgo(42, 9, 20),
      updatedAt: daysAgo(35, 15, 30),
    },
  ];

  const noteRows = [
    {
      id: demoNoteIds[0],
      businessId: business.id,
      inquiryId: demoInquiryIds[0],
      authorUserId: demoUser.id,
      body: "Customer sounds ready to move quickly. Ask for window dimensions and confirm whether installation should be quoted separately.",
      createdAt: noteTimestamps.storefront,
      updatedAt: noteTimestamps.storefront,
    },
    {
      id: demoNoteIds[1],
      businessId: business.id,
      inquiryId: demoInquiryIds[1],
      authorUserId: demoUser.id,
      body: "Waiting on paper stock preference and whether they want local pickup or courier delivery.",
      createdAt: noteTimestamps.flyers,
      updatedAt: noteTimestamps.flyers,
    },
    {
      id: demoNoteIds[2],
      businessId: business.id,
      inquiryId: demoInquiryIds[2],
      authorUserId: demoUser.id,
      body: "Files received. Banner hardware options might change cost range, so keep the reply specific but do not lock pricing until finish options are confirmed.",
      createdAt: noteTimestamps.boothKit,
      updatedAt: noteTimestamps.boothKit,
    },
    {
      id: demoNoteIds[3],
      businessId: business.id,
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
      businessId: business.id,
      question: "What is your normal turnaround time?",
      answer:
        "Standard print jobs usually ship or are ready for pickup within 3 to 5 business days after artwork approval. Rush timing depends on file readiness and production load.",
      position: 0,
      createdAt: daysAgo(30, 9, 0),
      updatedAt: daysAgo(30, 9, 0),
    },
    {
      id: demoFaqIds[1],
      businessId: business.id,
      question: "Which files should customers send?",
      answer:
        "Preferred files are press-ready PDF, AI, or SVG. High-resolution PNG can work for some jobs. If files are not print-ready, we can review them before quoting final production.",
      position: 1,
      createdAt: daysAgo(29, 9, 0),
      updatedAt: daysAgo(29, 9, 0),
    },
    {
      id: demoFaqIds[2],
      businessId: business.id,
      question: "Do you include revisions in the quote?",
      answer:
        "Quotes normally include one practical round of production adjustments. Larger redesign work or repeated revision rounds are quoted separately once scope is clear.",
      position: 2,
      createdAt: daysAgo(28, 9, 0),
      updatedAt: daysAgo(28, 9, 0),
    },
    {
      id: demoFaqIds[3],
      businessId: business.id,
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
      businessId: business.id,
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
      postAcceptanceStatus: "none" as const,
      validUntil: toIsoDate(daysFromNow(14)),
      createdAt: daysAgo(2, 15, 15),
      updatedAt: daysAgo(2, 15, 15),
    },
    {
      id: demoQuoteIds[1],
      businessId: business.id,
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
      postAcceptanceStatus: "none" as const,
      validUntil: toIsoDate(daysFromNow(5)),
      createdAt: daysAgo(6, 15, 0),
      updatedAt: daysAgo(5, 15, 0),
    },
    {
      id: demoQuoteIds[2],
      businessId: business.id,
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
      postAcceptanceStatus: "none" as const,
      validUntil: toIsoDate(daysFromNow(5)),
      createdAt: daysAgo(10, 10, 0),
      updatedAt: daysAgo(8, 16, 35),
    },
    {
      id: demoQuoteIds[3],
      businessId: business.id,
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
      postAcceptanceStatus: "none" as const,
      validUntil: toIsoDate(daysAgo(2)),
      createdAt: daysAgo(17, 12, 0),
      updatedAt: daysAgo(15, 14, 45),
    },
    {
      id: demoQuoteIds[4],
      businessId: business.id,
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
      postAcceptanceStatus: "none" as const,
      validUntil: toIsoDate(daysAgo(10)),
      createdAt: daysAgo(23, 11, 0),
      updatedAt: daysAgo(22, 11, 0),
    },
    {
      id: demoQuoteIds[5],
      businessId: business.id,
      inquiryId: demoInquiryIds[6],
      status: "accepted" as const,
      quoteNumber: "Q-0998",
      publicToken: demoQuotePublicTokens[5],
      title: "Foundry Labs rebrand signage package",
      customerName: "Priya Shah",
      customerEmail: "priya@foundrylabs.io",
      currency: "USD",
      notes:
        "Prior accepted signage package that moved into scheduling for the office refresh.",
      subtotalInCents: 348000,
      discountInCents: 18000,
      totalInCents: 330000,
      sentAt: daysAgo(39, 11, 0),
      acceptedAt: daysAgo(35, 15, 30),
      publicViewedAt: daysAgo(35, 14, 50),
      customerRespondedAt: daysAgo(35, 15, 30),
      customerResponseMessage:
        "Approved. Please line up installation for the week after next.",
      postAcceptanceStatus: "scheduled" as const,
      validUntil: toIsoDate(daysAgo(30)),
      createdAt: daysAgo(40, 11, 0),
      updatedAt: daysAgo(34, 10, 10),
    },
  ];

  const quoteItemRows = [
    {
      id: demoQuoteItemIds[0],
      businessId: business.id,
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
      businessId: business.id,
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
      businessId: business.id,
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
      businessId: business.id,
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
      businessId: business.id,
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
      businessId: business.id,
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
      businessId: business.id,
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
      businessId: business.id,
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
      businessId: business.id,
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
      businessId: business.id,
      quoteId: demoQuoteIds[4],
      description: "Reinforced grommets and finishing",
      quantity: 1,
      unitPriceInCents: 8000,
      lineTotalInCents: 8000,
      position: 1,
      createdAt: daysAgo(23, 11, 1),
      updatedAt: daysAgo(23, 11, 1),
    },
    {
      id: demoQuoteItemIds[10],
      businessId: business.id,
      quoteId: demoQuoteIds[5],
      description: "Lobby logo wall graphics",
      quantity: 1,
      unitPriceInCents: 214000,
      lineTotalInCents: 214000,
      position: 0,
      createdAt: daysAgo(40, 11, 0),
      updatedAt: daysAgo(40, 11, 0),
    },
    {
      id: demoQuoteItemIds[11],
      businessId: business.id,
      quoteId: demoQuoteIds[5],
      description: "Door signs and meeting room wayfinding",
      quantity: 1,
      unitPriceInCents: 134000,
      lineTotalInCents: 134000,
      position: 1,
      createdAt: daysAgo(40, 11, 1),
      updatedAt: daysAgo(40, 11, 1),
    },
  ];

  const replySnippetRows = [
    {
      id: demoReplySnippetIds[0],
      businessId: business.id,
      title: "Ask for missing dimensions",
      body:
        "Thanks for sending this over. To price it accurately, could you confirm the final dimensions, quantity, and whether installation should be included?",
      createdAt: daysAgo(18, 9, 0),
      updatedAt: daysAgo(18, 9, 0),
    },
    {
      id: demoReplySnippetIds[1],
      businessId: business.id,
      title: "Confirm timeline and files",
      body:
        "Before we lock the quote, please confirm your target install date and send the latest print-ready files or artwork links.",
      createdAt: daysAgo(16, 9, 0),
      updatedAt: daysAgo(16, 9, 0),
    },
  ];

  const activityRows = [
    {
      id: demoActivityIds[0],
      businessId: business.id,
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
      businessId: business.id,
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
      businessId: business.id,
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
      businessId: business.id,
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
      businessId: business.id,
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
      businessId: business.id,
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
      businessId: business.id,
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
      businessId: business.id,
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
      businessId: business.id,
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
      businessId: business.id,
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
      businessId: business.id,
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
      businessId: business.id,
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
      businessId: business.id,
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
      businessId: business.id,
      inquiryId: demoInquiryIds[6],
      quoteId: null,
      actorUserId: demoUser.id,
      type: "inquiry.status_changed",
      summary: "Past Foundry Labs rebrand inquiry marked won after the office signage package closed.",
      metadata: { source: "demo-seed", nextStatus: "won" },
      createdAt: daysAgo(35, 15, 30),
      updatedAt: daysAgo(35, 15, 30),
    },
    {
      id: demoActivityIds[14],
      businessId: business.id,
      inquiryId: demoInquiryIds[6],
      quoteId: demoQuoteIds[5],
      actorUserId: demoUser.id,
      type: "quote.created",
      summary: "Quote Q-0998 created for the Foundry Labs rebrand signage package.",
      metadata: { source: "demo-seed" },
      createdAt: daysAgo(40, 11, 0),
      updatedAt: daysAgo(40, 11, 0),
    },
    {
      id: demoActivityIds[15],
      businessId: business.id,
      inquiryId: demoInquiryIds[6],
      quoteId: demoQuoteIds[5],
      actorUserId: demoUser.id,
      type: "quote.post_acceptance_updated",
      summary: "Quote Q-0998 marked scheduled.",
      metadata: { source: "demo-seed", postAcceptanceStatus: "scheduled" },
      createdAt: daysAgo(34, 10, 10),
      updatedAt: daysAgo(34, 10, 10),
    },
    {
      id: demoActivityIds[16],
      businessId: business.id,
      inquiryId: null,
      quoteId: null,
      actorUserId: demoUser.id,
      type: "business.demo_seeded",
      summary: "Sample Requo MVP data refreshed for local setup.",
      metadata: { source: "demo-seed" },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // Generate bulk inquiry and quote data
  const bulkInquiries = await generateBulkInquiries(
    business.id,
    business.defaultInquiryFormId,
    demoUser.id,
    200,
  );
  const bulkQuotes = await generateBulkQuotes(
    business.id,
    bulkInquiries.map((i) => ({ id: i.id, status: i.status })),
  );
  const bulkQuoteItems = await generateBulkQuoteItems(
    business.id,
    bulkQuotes,
  );

  // Calculate lineTotals for bulk items
  bulkQuoteItems.forEach((item) => {
    item.lineTotalInCents = item.quantity * item.unitPriceInCents;
  });

  // Combine bulk data with demo data
  const allInquiries = [...inquiryRows, ...bulkInquiries];
  const allQuotes = [...quoteRows, ...bulkQuotes];
  const allQuoteItems = [...quoteItemRows, ...bulkQuoteItems];

  console.log(`Preparing to seed ${allInquiries.length} inquiries, ${allQuotes.length} quotes, and ${allQuoteItems.length} quote items...`);

  await db.transaction(async (tx) => {
    // Clean up all demo/bulk data
    await tx.delete(activityLogs).where(inArray(activityLogs.id, demoActivityIds));
    await tx.delete(inquiryNotes).where(inArray(inquiryNotes.id, demoNoteIds));
    
    // Delete all quote items, quotes and inquiries from demo sources
    await tx
      .delete(quoteItems)
      .where(eq(quoteItems.businessId, business.id));
    await tx
      .delete(quotes)
      .where(eq(quotes.businessId, business.id));
    await tx
      .delete(inquiries)
      .where(eq(inquiries.businessId, business.id));
    
    await tx.delete(knowledgeFaqs).where(inArray(knowledgeFaqs.id, demoFaqIds));
    await tx.delete(replySnippets).where(inArray(replySnippets.id, demoReplySnippetIds));

    await tx.insert(knowledgeFaqs).values(faqRows);
    await tx.insert(inquiries).values(allInquiries);
    await tx.insert(inquiryNotes).values(noteRows);
    await tx.insert(quotes).values(allQuotes);
    await tx.insert(quoteItems).values(allQuoteItems);
    await tx.insert(replySnippets).values(replySnippetRows);
    await tx.insert(activityLogs).values(activityRows);
  });
}

async function main() {
  const demoUser = await ensureDemoUser();
  const business = await ensureDemoBusiness(demoUser);

  await seedBusinessData(demoUser, business);

  const dashboardUrl = new URL(
    `/businesses/${business.slug}/dashboard`,
    env.BETTER_AUTH_URL,
  ).toString();
  const inquiryUrl = new URL(
    `/inquire/${business.slug}`,
    env.BETTER_AUTH_URL,
  ).toString();

  console.log("");
  console.log("Requo demo data seeded.");
  console.log(`Business: ${business.name}`);
  console.log(`Business slug: ${business.slug}`);
  console.log(`Demo owner email: ${demoUser.email}`);
  console.log(`Demo owner password: ${demoConfig.ownerPassword}`);
  console.log(`Dashboard URL: ${dashboardUrl}`);
  console.log(`Public inquiry URL: ${inquiryUrl}`);
  console.log("");
  console.log(
    "The script refreshes the fixed demo records for the demo business without touching other businesses.",
  );
}

main()
  .catch((error) => {
    console.error("Failed to seed Requo demo data.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await dbConnection.end({ timeout: 5 });
  });
