import "dotenv/config";

import { and, asc, eq, inArray, ne } from "drizzle-orm";

import { getStarterTemplateDefinition } from "../features/businesses/starter-templates";
import type { BusinessType } from "../features/inquiries/business-types";
import type { InquirySubmittedFieldSnapshot } from "../features/inquiries/form-config";
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
  workspaceMembers,
  workspaces,
} from "../lib/db/schema";
import { env } from "../lib/env";
import type { WorkspacePlan } from "../lib/plans/plans";

type DemoUser = {
  id: string;
  email: string;
  name: string;
  plan: WorkspacePlan;
};

type DemoBusiness = {
  key: string;
  id: string;
  kind: "primary" | "secondary";
  name: string;
  slug: string;
  businessType: BusinessType;
  defaultInquiryFormId: string;
  quoteNumberStart: number;
  forms: Record<
    string,
    {
      id: string;
      name: string;
      slug: string;
      businessType: BusinessType;
    }
  >;
};

type DemoInquiryStatus =
  | "new"
  | "waiting"
  | "quoted"
  | "won"
  | "lost"
  | "archived";

type DemoQuoteStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "expired";

type DemoFormDefinition = {
  key: string;
  name: string;
  slug: string;
  businessType: BusinessType;
  isDefault: boolean;
  distributionWeight: number;
  serviceCategories: string[];
  subjectTemplates: string[];
  detailTemplates: string[];
  budgetOptions: Array<string | null>;
};

type DemoBusinessDefinition = {
  key: string;
  kind: "primary" | "secondary";
  name: string;
  slug: string;
  businessType: BusinessType;
  shortDescription: string;
  inquiryHeadline: string;
  emailSignatureLines: string[];
  defaultQuoteNotes: string;
  aiTonePreference: "balanced" | "warm" | "direct" | "formal";
  defaultCurrency: string;
  inquiryCount: number;
  quoteNumberStart: number;
  forms: DemoFormDefinition[];
};

type GeneratedInquiryRow = {
  id: string;
  businessId: string;
  businessInquiryFormId: string;
  status: DemoInquiryStatus;
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
};

type GeneratedQuoteRow = {
  id: string;
  businessId: string;
  inquiryId: string | null;
  status: DemoQuoteStatus;
  quoteNumber: string;
  publicToken: string;
  title: string;
  customerName: string;
  customerEmail: string;
  currency: string;
  notes: string | null;
  subtotalInCents: number;
  discountInCents: number;
  totalInCents: number;
  sentAt: Date | null;
  acceptedAt: Date | null;
  publicViewedAt: Date | null;
  customerRespondedAt: Date | null;
  customerResponseMessage: string | null;
  postAcceptanceStatus: "none" | "booked" | "scheduled";
  validUntil: string;
  createdAt: Date;
  updatedAt: Date;
};

type GeneratedQuoteItemRow = {
  id: string;
  businessId: string;
  quoteId: string;
  description: string;
  quantity: number;
  unitPriceInCents: number;
  lineTotalInCents: number;
  position: number;
  createdAt: Date;
  updatedAt: Date;
};

type BusinessSeedCounts = {
  inquiries: number;
  quotes: number;
  quoteItems: number;
};

type PlanUserConfig = {
  name: string;
  email: string;
  plan: WorkspacePlan;
  businessName: string;
  businessSlug: string;
  businessType: BusinessType;
  hasSecondaryBusiness: boolean;
};

const DEFAULT_PASSWORD = "ChangeMe123456!";

const planUserConfigs: PlanUserConfig[] = [
  {
    name: "Free User",
    email: "free@requo.local",
    plan: "free",
    businessName: "FreeBiz Print Services",
    businessSlug: "freebiz-print-services",
    businessType: "print_signage",
    hasSecondaryBusiness: false,
  },
  {
    name: "Pro User",
    email: "pro@requo.local",
    plan: "pro",
    businessName: "ProPrint Studio",
    businessSlug: "proprint-studio",
    businessType: "print_signage",
    hasSecondaryBusiness: false,
  },
  {
    name: "Business User",
    email: "business@requo.local",
    plan: "business",
    businessName: "Enterprise Print Co",
    businessSlug: "enterprise-print-co",
    businessType: "print_signage",
    hasSecondaryBusiness: true,
  },
];

const teamMembers = [
  {
    name: "Sarah Manager",
    email: "business-manager@requo.local",
    role: "manager" as const,
  },
  {
    name: "Alex Staff",
    email: "business-staff@requo.local",
    role: "staff" as const,
  },
];

const secondaryBusinessDefinition: DemoBusinessDefinition = {
  key: "event",
  kind: "secondary",
  name: "Enterprise Event Graphics",
  slug: "enterprise-event-graphics",
  businessType: "event_services_rentals",
  shortDescription: "Large-scale event graphics and signage production.",
  inquiryHeadline: "Tell us about your event and we will quote the graphics.",
  emailSignatureLines: ["Enterprise Print Co", "Event Graphics Division"],
  defaultQuoteNotes: "Prices include standard production. Rush orders quoted separately.",
  aiTonePreference: "warm",
  defaultCurrency: "USD",
  inquiryCount: 80,
  quoteNumberStart: 5001,
  forms: [
    {
      key: "event",
      name: "Event request",
      slug: "event-request",
      businessType: "event_services_rentals",
      isDefault: true,
      distributionWeight: 50,
      serviceCategories: [
        "Conference banners",
        "Stage graphics",
        "Booth signage",
        "Venue signage",
      ],
      subjectTemplates: [
        "{category} request for {company}",
        "Need pricing on {category}",
        "{company} needs {category}",
      ],
      detailTemplates: [
        "We need {category} for an upcoming event and want a complete quote.",
        "Please quote {category}. We have venue details and need production and install timing.",
        "Looking for a quote on {category} with clear pricing and turnaround.",
      ],
      budgetOptions: ["$1,000-$3,000", "$3,000-$7,500", "$7,500+", null],
    },
  ],
};

const demoInquiryIds = [
  "seed_inquiry_storefront",
  "seed_inquiry_waiting",
  "seed_inquiry_quoted",
  "seed_inquiry_won",
  "seed_inquiry_lost",
];

function getDemoInquiryIds(key: string) {
  return demoInquiryIds.map((id) => `${id}_${key}`);
}

function getDemoQuoteIds(key: string) {
  return demoQuoteIds.map((id) => `${id}_${key}`);
}

function getDemoQuotePublicTokens(key: string) {
  return demoQuotePublicTokens.map((id) => `${id}_${key}`);
}

function getDemoQuoteItemIds(key: string) {
  return demoQuoteItemIds.map((id) => `${id}_${key}`);
}

function getDemoReplySnippetIds(key: string) {
  return demoReplySnippetIds.map((id) => `${id}_${key}`);
}

function getDemoFaqIds(key: string) {
  return demoFaqIds.map((id) => `${id}_${key}`);
}

function getDemoNoteIds(key: string) {
  return demoNoteIds.map((id) => `${id}_${key}`);
}

function getDemoActivityIds(key: string) {
  return demoActivityIds.map((id) => `${id}_${key}`);
}

const demoQuoteIds = [
  "seed_quote_draft_1001",
  "seed_quote_sent_1002",
  "seed_quote_accepted_1003",
  "seed_quote_rejected_1004",
  "seed_quote_expired_1005",
] as const;

const demoQuotePublicTokens = [
  "seed_quote_1001_draft_token",
  "seed_quote_1002_sent_token",
  "seed_quote_1003_accepted_token",
  "seed_quote_1004_rejected_token",
  "seed_quote_1005_expired_token",
] as const;

const demoQuoteItemIds = [
  "seed_quote_item_1001_a",
  "seed_quote_item_1001_b",
  "seed_quote_item_1002_a",
  "seed_quote_item_1002_b",
  "seed_quote_item_1003_a",
  "seed_quote_item_1003_b",
  "seed_quote_item_1004_a",
  "seed_quote_item_1004_b",
  "seed_quote_item_1005_a",
  "seed_quote_item_1005_b",
] as const;

const demoReplySnippetIds = [
  "seed_reply_snippet_dimensions",
  "seed_reply_snippet_timeline",
] as const;

const demoFaqIds = [
  "seed_faq_turnaround",
  "seed_faq_file_types",
] as const;

const demoNoteIds = [
  "seed_note_storefront",
  "seed_note_flyers",
] as const;

const demoActivityIds = [
  "seed_activity_inquiry_new",
  "seed_activity_quote_created_1001",
  "seed_activity_quote_created_1002",
  "seed_activity_quote_sent_1002",
  "seed_activity_quote_created_1003",
  "seed_activity_quote_accepted_1003",
  "seed_activity_quote_sent_1003",
  "seed_activity_quote_status_changed",
  "seed_activity_business_seeded",
] as const;

const inquiryStatusWeights: Array<{
  status: DemoInquiryStatus;
  weight: number;
}> = [
  { status: "new", weight: 20 },
  { status: "waiting", weight: 18 },
  { status: "quoted", weight: 22 },
  { status: "won", weight: 17 },
  { status: "lost", weight: 13 },
  { status: "archived", weight: 10 },
];

const customerFirstNames = [
  "James",
  "Maya",
  "Daniel",
  "Olivia",
  "Priya",
  "Carlos",
  "Harper",
  "Noah",
  "Amelia",
  "Marcus",
  "Ava",
  "Elena",
  "Jordan",
  "Sofia",
  "Adrian",
  "Natalie",
  "Leo",
  "Riley",
  "Mina",
  "Theo",
];

const customerLastNames = [
  "Smith",
  "Johnson",
  "Kim",
  "Patel",
  "Garcia",
  "Martinez",
  "Nguyen",
  "Anderson",
  "Thomas",
  "Bennett",
  "Park",
  "Shah",
  "Rivera",
  "Hughes",
  "Carter",
  "Sullivan",
  "Lopez",
  "Wilson",
  "O'Brien",
  "Davis",
];

const companyPrefixes = [
  "North Fork",
  "Harbor",
  "Summit",
  "Brightleaf",
  "Cedar",
  "Atlas",
  "Riverview",
  "Maple",
  "Bluebird",
  "Foundry",
  "Parkside",
  "Oakline",
  "Copper",
  "Mainline",
  "Willow",
];

const companySuffixes = [
  "Studio",
  "Collective",
  "Kitchen",
  "Builders",
  "Partners",
  "Labs",
  "Supply",
  "Market",
  "Wellness",
  "Media",
  "Works",
  "Advisors",
  "Group",
  "Company",
  "Clinic",
];

const generatedQuoteResponseMessages = {
  accepted: [
    "This works for us. Please move ahead and send the next steps.",
    "Approved. We are ready to schedule the work.",
    "Looks good. Please confirm timing so we can lock it in.",
  ],
  rejected: [
    "Thanks for the quote. We decided to go a different direction for now.",
    "We are pausing this scope and will revisit later.",
    "Appreciate the proposal, but we moved ahead with another vendor.",
  ],
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function addDays(date: Date, days: number) {
  return addMinutes(date, days * 24 * 60);
}

function clampToNow(date: Date) {
  const now = new Date();
  return date.getTime() > now.getTime() ? now : date;
}

function slugify(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return normalized || "business";
}

function createSeededId(prefix: string, ...parts: string[]) {
  return [prefix, ...parts.map((part) => slugify(part).replace(/-/g, "_"))].join(
    "_",
  );
}

function createSeededRandom(seed: string) {
  let hash = 2166136261;

  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return () => {
    hash += 0x6d2b79f5;
    let next = Math.imul(hash ^ (hash >>> 15), 1 | hash);
    next ^= next + Math.imul(next ^ (next >>> 7), 61 | next);

    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(random: () => number, minInclusive: number, maxExclusive: number) {
  return Math.floor(random() * (maxExclusive - minInclusive)) + minInclusive;
}

function chance(random: () => number, probability: number) {
  return random() < probability;
}

function pickOne<T>(values: T[], random: () => number) {
  return values[randomInt(random, 0, values.length)];
}

function pickWeighted<T>(
  values: Array<{
    item: T;
    weight: number;
  }>,
  random: () => number,
) {
  const totalWeight = values.reduce((sum, value) => sum + value.weight, 0);
  let threshold = random() * totalWeight;

  for (const value of values) {
    threshold -= value.weight;

    if (threshold <= 0) {
      return value.item;
    }
  }

  return values[values.length - 1]?.item ?? null;
}

function sanitizeEmailPart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function formatPhoneNumber(random: () => number) {
  const areaCode = randomInt(random, 200, 1000);
  const exchange = randomInt(random, 200, 1000);
  const line = String(randomInt(random, 0, 10_000)).padStart(4, "0");

  return `(${areaCode}) ${exchange}-${line}`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function fillTemplate(
  template: string,
  values: Record<string, string>,
) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
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

async function ensurePlanUser(config: PlanUserConfig): Promise<DemoUser> {
  let [existingUser] = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
    })
    .from(user)
    .where(eq(user.email, config.email.toLowerCase()))
    .limit(1);

  if (!existingUser) {
    await auth.api.signUpEmail({
      body: {
        name: config.name,
        email: config.email.toLowerCase(),
        password: DEFAULT_PASSWORD,
      },
    });

    [existingUser] = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
      })
      .from(user)
      .where(eq(user.email, config.email.toLowerCase()))
      .limit(1);
  }

  if (!existingUser) {
    throw new Error(`Unable to create or load the user for ${config.email}.`);
  }

  const now = new Date();

  await db
    .update(user)
    .set({
      name: config.name,
      updatedAt: now,
    })
    .where(eq(user.id, existingUser.id));

  await db
    .insert(profiles)
    .values({
      userId: existingUser.id,
      fullName: config.name,
      onboardingCompletedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        fullName: config.name,
        onboardingCompletedAt: now,
        updatedAt: now,
      },
    });

  await bootstrapBusinessForUser({
    id: existingUser.id,
    name: config.name,
    email: config.email,
  }, { plan: config.plan });

  await db
    .update(workspaces)
    .set({ plan: config.plan })
    .where(eq(workspaces.ownerUserId, existingUser.id));

  return {
    id: existingUser.id,
    email: existingUser.email,
    name: config.name,
    plan: config.plan,
  };
}

async function ensureTeamMember(
  ownerUser: DemoUser,
  name: string,
  email: string,
  role: "manager" | "staff",
): Promise<DemoUser> {
  let [existingUser] = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
    })
    .from(user)
    .where(eq(user.email, email.toLowerCase()))
    .limit(1);

  if (!existingUser) {
    await auth.api.signUpEmail({
      body: {
        name,
        email: email.toLowerCase(),
        password: DEFAULT_PASSWORD,
      },
    });

    [existingUser] = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
      })
      .from(user)
      .where(eq(user.email, email.toLowerCase()))
      .limit(1);
  }

  if (!existingUser) {
    throw new Error(`Unable to create or load the team member for ${email}.`);
  }

  const now = new Date();

  await db
    .update(user)
    .set({
      name,
      updatedAt: now,
    })
    .where(eq(user.id, existingUser.id));

  await db
    .insert(profiles)
    .values({
      userId: existingUser.id,
      fullName: name,
      onboardingCompletedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        fullName: name,
        onboardingCompletedAt: now,
        updatedAt: now,
      },
    });

  return {
    id: existingUser.id,
    email: existingUser.email,
    name,
    plan: ownerUser.plan,
  };
}

function getDefaultFormDefinition(definition: DemoBusinessDefinition) {
  const defaultForm = definition.forms.find((form) => form.isDefault);

  if (!defaultForm) {
    throw new Error(`Business "${definition.key}" is missing a default form.`);
  }

  return defaultForm;
}

async function syncBusinessForms(
  definition: DemoBusinessDefinition,
  businessId: string,
  currentDefaultFormId?: string,
) {
  const now = new Date();
  const syncedForms: DemoBusiness["forms"] = {};

  for (const formDefinition of definition.forms) {
    const formPreset = createInquiryFormPreset({
      businessType: formDefinition.businessType,
      businessName: definition.name,
      businessShortDescription: definition.shortDescription,
      legacyInquiryHeadline: definition.inquiryHeadline,
    });
    const [existingForm] = await db
      .select({ id: businessInquiryForms.id })
      .from(businessInquiryForms)
      .where(
        and(
          eq(businessInquiryForms.businessId, businessId),
          eq(businessInquiryForms.slug, formDefinition.slug),
        ),
      )
      .limit(1);
    const formId =
      formDefinition.isDefault && currentDefaultFormId
        ? currentDefaultFormId
        : existingForm?.id ??
          createSeededId("seed_ifm", definition.key, formDefinition.key);

    if (formDefinition.isDefault && currentDefaultFormId) {
      await db
        .update(businessInquiryForms)
        .set({
          name: formDefinition.name,
          slug: formDefinition.slug,
          businessType: formDefinition.businessType,
          isDefault: true,
          publicInquiryEnabled: true,
          inquiryFormConfig: formPreset.inquiryFormConfig,
          inquiryPageConfig: formPreset.inquiryPageConfig,
          archivedAt: null,
          updatedAt: now,
        })
        .where(eq(businessInquiryForms.id, formId));
    } else {
      await db
        .insert(businessInquiryForms)
        .values({
          id: formId,
          businessId,
          name: formDefinition.name,
          slug: formDefinition.slug,
          businessType: formDefinition.businessType,
          isDefault: formDefinition.isDefault,
          publicInquiryEnabled: true,
          inquiryFormConfig: formPreset.inquiryFormConfig,
          inquiryPageConfig: formPreset.inquiryPageConfig,
          archivedAt: null,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: businessInquiryForms.id,
          set: {
            name: formDefinition.name,
            slug: formDefinition.slug,
            businessType: formDefinition.businessType,
            isDefault: formDefinition.isDefault,
            publicInquiryEnabled: true,
            inquiryFormConfig: formPreset.inquiryFormConfig,
            inquiryPageConfig: formPreset.inquiryPageConfig,
            archivedAt: null,
            updatedAt: now,
          },
        });
    }

    syncedForms[formDefinition.key] = {
      id: formId,
      name: formDefinition.name,
      slug: formDefinition.slug,
      businessType: formDefinition.businessType,
    };
  }

  const defaultForm = getDefaultFormDefinition(definition);

  return {
    defaultInquiryFormId:
      currentDefaultFormId ?? syncedForms[defaultForm.key]?.id ?? "",
    forms: syncedForms,
  };
}

async function ensurePrimaryBusiness(
  demoUser: DemoUser,
  config: PlanUserConfig,
): Promise<DemoBusiness> {
  const [membership] = await db
    .select({
      businessId: businessMembers.businessId,
      role: businessMembers.role,
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
  const slug = await getAvailableSlug(config.businessSlug, membership.businessId);
  const inquiryPreset = createInquiryFormPreset({
    businessType: config.businessType,
    businessName: config.businessName,
    businessShortDescription: "Professional print services for businesses.",
    legacyInquiryHeadline: "Tell us what you need printed and we will turn it into a clean quote.",
  });
  const starterTemplate = getStarterTemplateDefinition(config.businessType);

  await db
    .update(businesses)
    .set({
      name: config.businessName,
      slug,
      businessType: config.businessType,
      shortDescription: "Professional print services for businesses.",
      contactEmail: demoUser.email,
      publicInquiryEnabled: true,
      inquiryHeadline: "Tell us what you need printed and we will turn it into a clean quote.",
      inquiryFormConfig: inquiryPreset.inquiryFormConfig,
      inquiryPageConfig: inquiryPreset.inquiryPageConfig,
      defaultEmailSignature: `${config.businessName}\n${demoUser.email}`,
      defaultQuoteNotes: starterTemplate.defaultQuoteNotes ?? "Standard production included.",
      defaultQuoteValidityDays: starterTemplate.defaultQuoteValidityDays,
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

  const syncedForms = await syncBusinessForms(
    {
      key: "primary",
      kind: "primary",
      name: config.businessName,
      slug,
      businessType: config.businessType,
      shortDescription: "Professional print services for businesses.",
      inquiryHeadline: "Tell us what you need printed.",
      emailSignatureLines: [config.businessName, demoUser.email],
      defaultQuoteNotes: "Standard production included.",
      aiTonePreference: "warm",
      defaultCurrency: "USD",
      inquiryCount: 100,
      quoteNumberStart: 1001,
      forms: [
        {
          key: "project",
          name: "Project request",
          slug: "project-request",
          businessType: config.businessType,
          isDefault: true,
          distributionWeight: 50,
          serviceCategories: [
            "Window graphics",
            "Event signage",
            "Menu boards",
            "Trade show kits",
            "Lobby graphics",
          ],
          subjectTemplates: [
            "{category} request for {company}",
            "Need pricing on {category}",
            "{company} needs {category}",
          ],
          detailTemplates: [
            "We need {category} for an upcoming launch and want pricing, material guidance, and timing.",
            "Please scope {category} for {company}. Files are partly ready.",
            "Looking for a quote on {category} with practical recommendations.",
          ],
          budgetOptions: ["$750-$1,500", "$1,500-$3,000", "$3,000+", null],
        },
        {
          key: "reorders",
          name: "Reorder request",
          slug: "reorder-request",
          businessType: config.businessType,
          isDefault: false,
          distributionWeight: 30,
          serviceCategories: [
            "Flyers",
            "Brochures",
            "Business cards",
            "Labels & stickers",
            "Postcards",
          ],
          subjectTemplates: [
            "Reorder quote for {category}",
            "{company} reorder for {category}",
            "Need a repeat run of {category}",
          ],
          detailTemplates: [
            "This is a repeat order for {category}. Please match the last run.",
            "We need a fresh quote for {category} with updated quantities.",
          ],
          budgetOptions: ["$250-$500", "$500-$1,000", "$1,000-$2,500", null],
        },
        {
          key: "install",
          name: "Install request",
          slug: "install-request",
          businessType: config.businessType,
          isDefault: false,
          distributionWeight: 20,
          serviceCategories: [
            "Window vinyl install",
            "Wayfinding signs",
            "Wall graphics",
            "Door decals",
            "Exterior banner install",
          ],
          subjectTemplates: [
            "Need a quote for {category}",
            "{company} install scope for {category}",
          ],
          detailTemplates: [
            "Need help quoting {category} with site install.",
            "Please estimate {category} with production and install.",
          ],
          budgetOptions: ["$1,000-$2,500", "$2,500-$5,000", "$5,000+", null],
        },
      ],
    },
    membership.businessId,
    defaultForm.id,
  );

  return {
    key: "primary",
    id: membership.businessId,
    kind: "primary",
    name: config.businessName,
    slug,
    businessType: config.businessType,
    defaultInquiryFormId: syncedForms.defaultInquiryFormId,
    quoteNumberStart: 1001,
    forms: syncedForms.forms,
  };
}

async function ensureSecondaryBusiness(
  demoUser: DemoUser,
  definition: DemoBusinessDefinition,
): Promise<DemoBusiness> {
  const businessId = createSeededId("seed_biz", definition.key);
  const [existingBusiness] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);
  const slug = await getAvailableSlug(definition.slug, existingBusiness?.id);
  const now = new Date();
  const inquiryPreset = createInquiryFormPreset({
    businessType: definition.businessType,
    businessName: definition.name,
    businessShortDescription: definition.shortDescription,
    legacyInquiryHeadline: definition.inquiryHeadline,
  });
  const starterTemplate = getStarterTemplateDefinition(definition.businessType);

  const [workspaceMembership] = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, demoUser.id))
    .limit(1);

  if (!workspaceMembership) {
    throw new Error("Demo user has no workspace.");
  }

  const workspaceId = workspaceMembership.workspaceId;

  await db.transaction(async (tx) => {
    if (existingBusiness) {
      await tx
        .update(businesses)
        .set({
          workspaceId,
          name: definition.name,
          slug,
          businessType: definition.businessType,
          shortDescription: definition.shortDescription,
          contactEmail: demoUser.email,
          publicInquiryEnabled: true,
          inquiryHeadline: definition.inquiryHeadline,
          inquiryFormConfig: inquiryPreset.inquiryFormConfig,
          inquiryPageConfig: inquiryPreset.inquiryPageConfig,
          defaultEmailSignature: definition.emailSignatureLines.join("\n"),
          defaultQuoteNotes: definition.defaultQuoteNotes,
          defaultQuoteValidityDays: starterTemplate.defaultQuoteValidityDays,
          aiTonePreference: definition.aiTonePreference,
          notifyOnNewInquiry: true,
          notifyOnQuoteSent: true,
          notifyOnQuoteResponse: true,
          notifyInAppOnNewInquiry: true,
          notifyInAppOnQuoteResponse: true,
          defaultCurrency: definition.defaultCurrency,
          updatedAt: now,
        })
        .where(eq(businesses.id, businessId));
    } else {
      await tx.insert(businesses).values({
        id: businessId,
        workspaceId,
        name: definition.name,
        slug,
        businessType: definition.businessType,
        shortDescription: definition.shortDescription,
        contactEmail: demoUser.email,
        publicInquiryEnabled: true,
        inquiryHeadline: definition.inquiryHeadline,
        inquiryFormConfig: inquiryPreset.inquiryFormConfig,
        inquiryPageConfig: inquiryPreset.inquiryPageConfig,
        defaultEmailSignature: definition.emailSignatureLines.join("\n"),
        defaultQuoteNotes: definition.defaultQuoteNotes,
        defaultQuoteValidityDays: starterTemplate.defaultQuoteValidityDays,
        aiTonePreference: definition.aiTonePreference,
        notifyOnNewInquiry: true,
        notifyOnQuoteSent: true,
        notifyOnQuoteResponse: true,
        notifyInAppOnNewInquiry: true,
        notifyInAppOnQuoteResponse: true,
        defaultCurrency: definition.defaultCurrency,
        createdAt: now,
        updatedAt: now,
      });
    }

    const [existingMembership] = await tx
      .select({ id: businessMembers.id, role: businessMembers.role })
      .from(businessMembers)
      .where(
        and(
          eq(businessMembers.businessId, businessId),
          eq(businessMembers.userId, demoUser.id),
        ),
      )
      .limit(1);

    if (!existingMembership) {
      await tx.insert(businessMembers).values({
        id: createSeededId("seed_bm", definition.key),
        businessId,
        userId: demoUser.id,
        role: "owner",
        createdAt: now,
        updatedAt: now,
      });
    }

    await tx
      .insert(activityLogs)
      .values({
        id: createSeededId("seed_act", definition.key, "created"),
        businessId,
        actorUserId: demoUser.id,
        type: "business.created",
        summary: `Seed business ${definition.name} created.`,
        metadata: {
          source: "demo-seed",
        },
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();
  });

  const syncedForms = await syncBusinessForms(definition, businessId);

  return {
    key: definition.key,
    id: businessId,
    kind: definition.kind,
    name: definition.name,
    slug,
    businessType: definition.businessType,
    defaultInquiryFormId: syncedForms.defaultInquiryFormId,
    quoteNumberStart: definition.quoteNumberStart,
    forms: syncedForms.forms,
  };
}

function generateBulkInquiries(
  businessKey: string,
  business: DemoBusiness,
  businessType: BusinessType,
  count = 30,
) {
  const random = createSeededRandom(`${businessKey}:inquiries`);
  const forms = Object.values(business.forms);
  const inquiries: GeneratedInquiryRow[] = [];

  for (let index = 0; index < count; index += 1) {
    const form = pickOne(forms, random);
    const firstName = pickOne(customerFirstNames, random);
    const lastName = pickOne(customerLastNames, random);
    const company = `${pickOne(companyPrefixes, random)} ${pickOne(
      companySuffixes,
      random,
    )}`;
    const serviceCategory = pickOne(form.businessType === "print_signage"
      ? ["Window graphics", "Event signage", "Menu boards", "Trade show kits", "Flyers"]
      : ["Conference banners", "Stage graphics", "Booth signage", "Venue signage"], random);
    const status =
      pickWeighted(
        inquiryStatusWeights.map((value) => ({
          item: value.status,
          weight: value.weight,
        })),
        random,
      ) ?? "new";
    const submittedAt = daysAgo(
      randomInt(random, 0, 150),
      randomInt(random, 8, 18),
      randomInt(random, 0, 60),
    );
    const lastRespondedAt =
      status === "new"
        ? null
        : clampToNow(addMinutes(submittedAt, randomInt(random, 90, 8 * 24 * 60)));
    const requestedDeadline = chance(random, 0.72)
      ? toIsoDate(addDays(submittedAt, randomInt(random, 5, 45)))
      : null;
    const customerEmail = `${sanitizeEmailPart(firstName)}.${sanitizeEmailPart(
      lastName,
    )}@${sanitizeEmailPart(company) || "client"}.co`.slice(0, 254);
    const companyName = chance(random, 0.12) ? null : company;
    const companyLabel = companyName ?? `${firstName} ${lastName}`;
    const quoteRequested =
      status === "quoted" || status === "won" || status === "lost"
        ? true
        : !chance(random, 0.08);

    inquiries.push({
      id: createSeededId(
        "seed_inquiry",
        businessKey,
        String(index + 1).padStart(4, "0"),
      ),
      businessId: business.id,
      businessInquiryFormId: form.id,
      status,
      subject: `${serviceCategory} request for ${companyLabel}`,
      customerName: `${firstName} ${lastName}`,
      customerEmail,
      customerPhone: chance(random, 0.72) ? formatPhoneNumber(random) : null,
      serviceCategory,
      requestedDeadline,
      budgetText: pickOne(["$500-$1,000", "$1,000-$2,500", "$2,500+", null], random),
      companyName,
      details: `Looking for a quote on ${serviceCategory.toLowerCase()} for ${companyLabel}.`,

      source: `demo-seed-generated:${businessKey}`,
      quoteRequested,
      submittedAt,
      lastRespondedAt,
      createdAt: submittedAt,
      updatedAt: lastRespondedAt ?? submittedAt,
    });
  }

  return inquiries;
}

function shouldGenerateQuote(status: DemoInquiryStatus, random: () => number) {
  switch (status) {
    case "quoted":
    case "won":
    case "lost":
      return true;
    case "waiting":
      return chance(random, 0.35);
    case "archived":
      return chance(random, 0.2);
    case "new":
    default:
      return false;
  }
}

function getGeneratedQuoteStatus(
  status: DemoInquiryStatus,
  random: () => number,
): DemoQuoteStatus | null {
  switch (status) {
    case "quoted":
      return chance(random, 0.45) ? "draft" : "sent";
    case "waiting":
      return "draft";
    case "won":
      return "accepted";
    case "lost":
      return chance(random, 0.2) ? "expired" : "rejected";
    case "archived":
      return "expired";
    case "new":
    default:
      return null;
  }
}

function generateBulkQuoteData(
  businessKey: string,
  business: DemoBusiness,
  inquiryRows: GeneratedInquiryRow[],
  quoteNumberStart: number,
) {
  const random = createSeededRandom(`${businessKey}:quotes`);
  const quoteRows: GeneratedQuoteRow[] = [];
  const quoteItemRows: GeneratedQuoteItemRow[] = [];
  let quoteNumber = quoteNumberStart;
  let quoteIndex = 1;

  for (const inquiry of inquiryRows) {
    if (!inquiry.quoteRequested || !shouldGenerateQuote(inquiry.status, random)) {
      continue;
    }

    const quoteStatus = getGeneratedQuoteStatus(inquiry.status, random);

    if (!quoteStatus) {
      continue;
    }

    const quoteId = createSeededId(
      "seed_quote",
      businessKey,
      String(quoteIndex).padStart(4, "0"),
    );
    const createdAt = clampToNow(
      addMinutes(inquiry.submittedAt, randomInt(random, 45, 4 * 24 * 60)),
    );
    const sentAt =
      quoteStatus === "draft"
        ? null
        : clampToNow(addMinutes(createdAt, randomInt(random, 30, 18 * 60)));
    const publicViewedAt =
      sentAt && chance(random, quoteStatus === "expired" ? 0.55 : 0.88)
        ? clampToNow(addMinutes(sentAt, randomInt(random, 30, 3 * 24 * 60)))
        : null;
    const customerRespondedAt =
      quoteStatus === "accepted" || quoteStatus === "rejected"
        ? clampToNow(
            addMinutes(
              publicViewedAt ?? sentAt ?? createdAt,
              randomInt(random, 30, 5 * 24 * 60),
            ),
          )
        : null;
    const acceptedAt = quoteStatus === "accepted" ? customerRespondedAt : null;
    const postAcceptanceStatus =
      quoteStatus === "accepted"
        ? pickWeighted(
            [
              { item: "scheduled" as const, weight: 55 },
              { item: "booked" as const, weight: 30 },
              { item: "none" as const, weight: 15 },
            ],
            random,
          ) ?? "none"
        : "none";
    const itemCount = randomInt(random, 2, 5);
    const lineItemDescriptions = [
      `${inquiry.serviceCategory} scope`,
      "Planning and coordination",
      "Production and execution",
      "Delivery and quality assurance",
    ].slice(0, itemCount);
    const lineItems = lineItemDescriptions.map((description, position) => {
      const quantity = position === 0 ? randomInt(random, 1, 5) : 1;
      const unitPriceInCents =
        position === 0
          ? randomInt(random, 18_000, 95_000)
          : randomInt(random, 4_500, 35_000);

      return {
        id: createSeededId(
          "seed_quote_item",
          businessKey,
          String(quoteIndex).padStart(4, "0"),
          String(position + 1),
        ),
        businessId: business.id,
        quoteId,
        description,
        quantity,
        unitPriceInCents,
        lineTotalInCents: quantity * unitPriceInCents,
        position,
        createdAt: addMinutes(createdAt, position),
        updatedAt: addMinutes(createdAt, position),
      };
    });
    const subtotalInCents = lineItems.reduce(
      (sum, item) => sum + item.lineTotalInCents,
      0,
    );
    const maxDiscount = Math.max(1_500, Math.floor(subtotalInCents * 0.12));
    const discountInCents = chance(random, 0.32)
      ? randomInt(random, 500, maxDiscount + 1)
      : 0;
    const totalInCents = subtotalInCents - discountInCents;
    const validUntilDate = addDays(
      sentAt ?? createdAt,
      randomInt(random, 7, 21),
    );
    const customerResponseMessage =
      quoteStatus === "accepted"
        ? pickOne(generatedQuoteResponseMessages.accepted, random)
        : quoteStatus === "rejected"
          ? pickOne(generatedQuoteResponseMessages.rejected, random)
          : null;
    const updatedAt =
      customerRespondedAt ?? publicViewedAt ?? sentAt ?? createdAt;

    quoteRows.push({
      id: quoteId,
      businessId: business.id,
      inquiryId: inquiry.id,
      status: quoteStatus,
      quoteNumber: `Q-${quoteNumber}`,
      publicToken: createSeededId("seed_token", businessKey, String(quoteNumber)),
      title: `${inquiry.serviceCategory} quote`,
      customerName: inquiry.customerName,
      customerEmail: inquiry.customerEmail,
      currency: "USD",
      notes: `Generated sample quote for ${inquiry.serviceCategory.toLowerCase()}.`,
      subtotalInCents,
      discountInCents,
      totalInCents,
      sentAt,
      acceptedAt,
      publicViewedAt,
      customerRespondedAt,
      customerResponseMessage,
      postAcceptanceStatus,
      validUntil: toIsoDate(validUntilDate),
      createdAt,
      updatedAt,
    });
    quoteItemRows.push(...lineItems);

    quoteNumber += 1;
    quoteIndex += 1;
  }

  return {
    quotes: quoteRows,
    quoteItems: quoteItemRows,
  };
}

function createGeneratedDataset(
  businessKey: string,
  business: DemoBusiness,
  quoteNumberStart: number,
) {
  const inquiries = generateBulkInquiries(businessKey, business, business.businessType);
  const { quotes, quoteItems } = generateBulkQuoteData(
    businessKey,
    business,
    inquiries,
    quoteNumberStart,
  );

  return {
    inquiries,
    quotes,
    quoteItems,
  };
}

async function seedBusinessData(
  demoUser: DemoUser,
  business: DemoBusiness,
  businessKey: string,
): Promise<BusinessSeedCounts> {
  const noteTimestamps = {
    storefront: daysAgo(1, 14, 20),
    flyers: daysAgo(3, 11, 40),
    boothKit: daysAgo(6, 16, 15),
    menuBundle: daysAgo(10, 13, 5),
  };
  const projectFormId = business.forms.project?.id ?? business.defaultInquiryFormId;
  const reorderFormId =
    business.forms.reorders?.id ?? business.defaultInquiryFormId;
  const installFormId = business.forms.install?.id ?? business.defaultInquiryFormId;

  const keyedInquiryIds = getDemoInquiryIds(businessKey);
  const keyedQuoteIds = getDemoQuoteIds(businessKey);
  const keyedQuotePublicTokens = getDemoQuotePublicTokens(businessKey);
  const keyedQuoteItemIds = getDemoQuoteItemIds(businessKey);
  const keyedReplySnippetIds = getDemoReplySnippetIds(businessKey);
  const keyedFaqIds = getDemoFaqIds(businessKey);
  const keyedNoteIds = getDemoNoteIds(businessKey);
  const keyedActivityIds = getDemoActivityIds(businessKey);

  const inquiryRows = [
    {
      id: keyedInquiryIds[0],
      businessId: business.id,
      businessInquiryFormId: installFormId,
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
        "We need front window vinyl for a weekend store refresh. Two large panels plus door hours decal.",

      source: "demo-seed",
      quoteRequested: true,
      submittedAt: daysAgo(1, 9, 15),
      lastRespondedAt: null,
      createdAt: daysAgo(1, 9, 15),
      updatedAt: daysAgo(1, 9, 15),
    },
    {
      id: keyedInquiryIds[1],
      businessId: business.id,
      businessInquiryFormId: projectFormId,
      status: "waiting" as const,
      subject: "Business flyers reprint",
      customerName: "Noah Rivera",
      customerEmail: "noah@cedarcove.co",
      customerPhone: "(415) 555-0198",
      serviceCategory: "Flyers & brochures",
      requestedDeadline: toIsoDate(daysFromNow(12)),
      budgetText: "$800 to $1,200",
      companyName: "Cedar Cove Winery",
      details:
        "Need 2,000 flyers for an upcoming wine tasting event. Glossy cardstock, full color.",

      source: "demo-seed",
      quoteRequested: true,
      submittedAt: daysAgo(3, 11, 40),
      lastRespondedAt: daysAgo(2, 14, 0),
      createdAt: daysAgo(3, 11, 40),
      updatedAt: daysAgo(2, 14, 0),
    },
    {
      id: keyedInquiryIds[2],
      businessId: business.id,
      businessInquiryFormId: reorderFormId,
      status: "quoted" as const,
      subject: "Trade show booth kit",
      customerName: "Priya Shah",
      customerEmail: "priya@foundrylabs.io",
      customerPhone: "(650) 555-0177",
      serviceCategory: "Trade show displays",
      requestedDeadline: toIsoDate(daysFromNow(20)),
      budgetText: "$2,500 to $3,500",
      companyName: "Foundry Labs",
      details:
        "Full booth package needed for tech conference. Retractable banner, table throw, and wall graphics.",

      source: "demo-seed",
      quoteRequested: true,
      submittedAt: daysAgo(6, 15, 0),
      lastRespondedAt: daysAgo(5, 15, 0),
      createdAt: daysAgo(6, 15, 0),
      updatedAt: daysAgo(5, 15, 0),
    },
    {
      id: keyedInquiryIds[3],
      businessId: business.id,
      businessInquiryFormId: installFormId,
      status: "won" as const,
      subject: "Menu board package",
      customerName: "Maya Chen",
      customerEmail: "maya@harborroast.com",
      customerPhone: "(415) 555-0133",
      serviceCategory: "Interior signage",
      requestedDeadline: toIsoDate(daysFromNow(10)),
      budgetText: "$900 to $1,200",
      companyName: "Harbor Roast Coffee",
      details:
        "Custom menu boards for our new location. Two large boards with chalkboard style design.",

      source: "demo-seed",
      quoteRequested: true,
      submittedAt: daysAgo(10, 10, 0),
      lastRespondedAt: daysAgo(9, 10, 0),
      createdAt: daysAgo(10, 10, 0),
      updatedAt: daysAgo(8, 16, 35),
    },
  ];

  const noteRows = [
    {
      id: keyedNoteIds[0],
      businessId: business.id,
      inquiryId: keyedInquiryIds[0],
      authorUserId: demoUser.id,
      body: "Customer sounds ready to move quickly. Ask for window dimensions and confirm install timing.",
      createdAt: noteTimestamps.storefront,
      updatedAt: noteTimestamps.storefront,
    },
    {
      id: keyedNoteIds[1],
      businessId: business.id,
      inquiryId: keyedInquiryIds[1],
      authorUserId: demoUser.id,
      body: "Waiting on paper stock preference and whether they want local pickup or courier delivery.",
      createdAt: noteTimestamps.flyers,
      updatedAt: noteTimestamps.flyers,
    },
  ];

  const faqRows = [
    {
      id: keyedFaqIds[0],
      businessId: business.id,
      question: "What is your normal turnaround time?",
      answer:
        "Standard print jobs usually ship or are ready for pickup within 3 to 5 business days after artwork approval.",
      position: 0,
      createdAt: daysAgo(30, 9, 0),
      updatedAt: daysAgo(30, 9, 0),
    },
    {
      id: keyedFaqIds[1],
      businessId: business.id,
      question: "Which files should customers send?",
      answer:
        "Preferred files are press-ready PDF, AI, or SVG. High-resolution PNG can work for some jobs.",
      position: 1,
      createdAt: daysAgo(29, 9, 0),
      updatedAt: daysAgo(29, 9, 0),
    },
  ];

  const quoteRows = [
    {
      id: keyedQuoteIds[0],
      businessId: business.id,
      inquiryId: null,
      status: "draft" as const,
      quoteNumber: "Q-1001",
      publicToken: keyedQuotePublicTokens[0],
      title: "Seasonal sidewalk sign refresh",
      customerName: "Jamie Torres",
      customerEmail: "jamie@cedarandlane.co",
      currency: "USD",
      notes:
        "Draft quote prepared from a walk-in conversation. Final scope still depends on hardware preference.",
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
      id: keyedQuoteIds[1],
      businessId: business.id,
      inquiryId: keyedInquiryIds[2],
      status: "sent" as const,
      quoteNumber: "Q-1002",
      publicToken: keyedQuotePublicTokens[1],
      title: "Foundry Labs booth kit",
      customerName: "Priya Shah",
      customerEmail: "priya@foundrylabs.io",
      currency: "USD",
      notes:
        "Includes retractable banner hardware, table throw production, and mounted event signage.",
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
      id: keyedQuoteIds[2],
      businessId: business.id,
      inquiryId: keyedInquiryIds[3],
      status: "accepted" as const,
      quoteNumber: "Q-1003",
      publicToken: keyedQuotePublicTokens[2],
      title: "Harbor Roast menu board package",
      customerName: "Maya Chen",
      customerEmail: "maya@harborroast.com",
      currency: "USD",
      notes:
        "Accepted package includes menu boards, counter cards, and mounting hardware.",
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
  ];

  const quoteItemRows = [
    {
      id: keyedQuoteItemIds[0],
      businessId: business.id,
      quoteId: keyedQuoteIds[0],
      description: "A-frame sign panel production",
      quantity: 2,
      unitPriceInCents: 28000,
      lineTotalInCents: 56000,
      position: 0,
      createdAt: daysAgo(2, 15, 15),
      updatedAt: daysAgo(2, 15, 15),
    },
    {
      id: keyedQuoteItemIds[1],
      businessId: business.id,
      quoteId: keyedQuoteIds[0],
      description: "Weather-laminate finishing and install kit",
      quantity: 1,
      unitPriceInCents: 41000,
      lineTotalInCents: 41000,
      position: 1,
      createdAt: daysAgo(2, 15, 16),
      updatedAt: daysAgo(2, 15, 16),
    },
    {
      id: keyedQuoteItemIds[2],
      businessId: business.id,
      quoteId: keyedQuoteIds[1],
      description: "Retractable banner kit",
      quantity: 2,
      unitPriceInCents: 62000,
      lineTotalInCents: 124000,
      position: 0,
      createdAt: daysAgo(6, 15, 0),
      updatedAt: daysAgo(6, 15, 0),
    },
    {
      id: keyedQuoteItemIds[3],
      businessId: business.id,
      quoteId: keyedQuoteIds[1],
      description: "Table throw and mounted booth signage",
      quantity: 1,
      unitPriceInCents: 162000,
      lineTotalInCents: 162000,
      position: 1,
      createdAt: daysAgo(6, 15, 1),
      updatedAt: daysAgo(6, 15, 1),
    },
    {
      id: keyedQuoteItemIds[4],
      businessId: business.id,
      quoteId: keyedQuoteIds[2],
      description: "Rigid menu board set",
      quantity: 3,
      unitPriceInCents: 24000,
      lineTotalInCents: 72000,
      position: 0,
      createdAt: daysAgo(10, 10, 0),
      updatedAt: daysAgo(10, 10, 0),
    },
    {
      id: keyedQuoteItemIds[5],
      businessId: business.id,
      quoteId: keyedQuoteIds[2],
      description: "Counter cards and mounting hardware",
      quantity: 1,
      unitPriceInCents: 40000,
      lineTotalInCents: 40000,
      position: 1,
      createdAt: daysAgo(10, 10, 1),
      updatedAt: daysAgo(10, 10, 1),
    },
  ];

  const replySnippetRows = [
    {
      id: keyedReplySnippetIds[0],
      businessId: business.id,
      title: "Ask for missing dimensions",
      body:
        "Thanks for sending this over. To price it accurately, could you confirm the final dimensions and quantity?",
      createdAt: daysAgo(18, 9, 0),
      updatedAt: daysAgo(18, 9, 0),
    },
  ];

  const activityRows = [
    {
      id: keyedActivityIds[0],
      businessId: business.id,
      inquiryId: keyedInquiryIds[0],
      quoteId: null,
      actorUserId: demoUser.id,
      type: "inquiry.received",
      summary: "New storefront inquiry received from Park & Pine.",
      metadata: { source: "demo-seed" },
      createdAt: daysAgo(1, 9, 15),
      updatedAt: daysAgo(1, 9, 15),
    },
    {
      id: keyedActivityIds[1],
      businessId: business.id,
      inquiryId: null,
      quoteId: keyedQuoteIds[0],
      actorUserId: demoUser.id,
      type: "quote.created",
      summary: "Draft quote Q-1001 created from a manual request.",
      metadata: { source: "demo-seed" },
      createdAt: daysAgo(2, 15, 15),
      updatedAt: daysAgo(2, 15, 15),
    },
    {
      id: keyedActivityIds[2],
      businessId: business.id,
      inquiryId: keyedInquiryIds[2],
      quoteId: keyedQuoteIds[1],
      actorUserId: demoUser.id,
      type: "quote.created",
      summary: "Quote Q-1002 prepared for the Foundry Labs booth kit.",
      metadata: { source: "demo-seed" },
      createdAt: daysAgo(6, 15, 0),
      updatedAt: daysAgo(6, 15, 0),
    },
    {
      id: keyedActivityIds[3],
      businessId: business.id,
      inquiryId: keyedInquiryIds[2],
      quoteId: keyedQuoteIds[1],
      actorUserId: demoUser.id,
      type: "quote.sent",
      summary: "Quote Q-1002 sent to Priya Shah.",
      metadata: { source: "demo-seed" },
      createdAt: daysAgo(5, 15, 0),
      updatedAt: daysAgo(5, 15, 0),
    },
    {
      id: keyedActivityIds[4],
      businessId: business.id,
      inquiryId: keyedInquiryIds[3],
      quoteId: keyedQuoteIds[2],
      actorUserId: demoUser.id,
      type: "quote.created",
      summary: "Quote Q-1003 created for the Harbor Roast menu refresh.",
      metadata: { source: "demo-seed" },
      createdAt: daysAgo(10, 10, 0),
      updatedAt: daysAgo(10, 10, 0),
    },
    {
      id: keyedActivityIds[5],
      businessId: business.id,
      inquiryId: keyedInquiryIds[3],
      quoteId: keyedQuoteIds[2],
      actorUserId: demoUser.id,
      type: "quote.status_changed",
      summary: "Quote Q-1003 marked accepted.",
      metadata: { source: "demo-seed", nextStatus: "accepted" },
      createdAt: daysAgo(8, 16, 35),
      updatedAt: daysAgo(8, 16, 35),
    },
    {
      id: keyedActivityIds[8],
      businessId: business.id,
      inquiryId: null,
      quoteId: null,
      actorUserId: demoUser.id,
      type: "business.demo_seeded",
      summary: "Sample Requo data seeded for plan demo.",
      metadata: { source: "demo-seed", plan: demoUser.plan },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const generatedData = createGeneratedDataset(`${businessKey}-primary`, business, business.quoteNumberStart);
  const bulkInquiries = generatedData.inquiries;
  const bulkQuotes = generatedData.quotes;
  const bulkQuoteItems = generatedData.quoteItems;

  const allInquiries = [...inquiryRows, ...bulkInquiries];
  const allQuotes = [...quoteRows, ...bulkQuotes];
  const allQuoteItems = [...quoteItemRows, ...bulkQuoteItems];

  console.log(
    `Seeding ${business.name}: ${allInquiries.length} inquiries, ${allQuotes.length} quotes, ${allQuoteItems.length} quote items.`,
  );

  await db.transaction(async (tx) => {
    await tx.delete(activityLogs).where(inArray(activityLogs.id, keyedActivityIds));
    await tx.delete(inquiryNotes).where(inArray(inquiryNotes.id, keyedNoteIds));

    await tx
      .delete(quoteItems)
      .where(eq(quoteItems.businessId, business.id));
    await tx
      .delete(quotes)
      .where(eq(quotes.businessId, business.id));
    await tx
      .delete(inquiries)
      .where(eq(inquiries.businessId, business.id));

    await tx.delete(knowledgeFaqs).where(inArray(knowledgeFaqs.id, keyedFaqIds));
    await tx.delete(replySnippets).where(inArray(replySnippets.id, keyedReplySnippetIds));

    await tx.delete(inquiries).where(
      eq(inquiries.businessId, business.id)
    );
    await tx.delete(quotes).where(
      eq(quotes.businessId, business.id)
    );
    await tx.delete(quoteItems).where(
      eq(quoteItems.businessId, business.id)
    );

    await tx.insert(knowledgeFaqs).values(faqRows);
    await tx.insert(inquiries).values(allInquiries);
    await tx.insert(quotes).values(allQuotes);
    await tx.insert(quoteItems).values(allQuoteItems);
    await tx.insert(inquiryNotes).values(noteRows);
    await tx.insert(replySnippets).values(replySnippetRows);
    await tx.insert(activityLogs).values(activityRows);
  });

  return {
    inquiries: allInquiries.length,
    quotes: allQuotes.length,
    quoteItems: allQuoteItems.length,
  };
}

async function seedSecondaryBusinessData(
  demoUser: DemoUser,
  business: DemoBusiness,
  businessKey: string,
): Promise<BusinessSeedCounts> {
  const generatedData = createGeneratedDataset(businessKey, business, business.quoteNumberStart);
  const seedActivityId = createSeededId("seed_act", businessKey, "seeded");

  console.log(
    `Seeding ${business.name}: ${generatedData.inquiries.length} inquiries, ${generatedData.quotes.length} quotes.`,
  );

  await db.transaction(async (tx) => {
    await tx.delete(activityLogs).where(eq(activityLogs.id, seedActivityId));
    await tx
      .delete(quoteItems)
      .where(eq(quoteItems.businessId, business.id));
    await tx
      .delete(quotes)
      .where(eq(quotes.businessId, business.id));
    await tx
      .delete(inquiries)
      .where(eq(inquiries.businessId, business.id));

    await tx.insert(inquiries).values(generatedData.inquiries);
    await tx.insert(quotes).values(generatedData.quotes);
    await tx.insert(quoteItems).values(generatedData.quoteItems);
    await tx.insert(activityLogs).values({
      id: seedActivityId,
      businessId: business.id,
      inquiryId: null,
      quoteId: null,
      actorUserId: demoUser.id,
      type: "business.demo_seeded",
      summary: `Sample data refreshed for ${business.name}.`,
      metadata: {
        source: "demo-seed",
        businessKey,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  return {
    inquiries: generatedData.inquiries.length,
    quotes: generatedData.quotes.length,
    quoteItems: generatedData.quoteItems.length,
  };
}

async function syncBusinessMembers({
  owner,
  businessId,
  managerId,
  staffId,
}: {
  owner: DemoUser;
  businessId: string;
  managerId?: string;
  staffId?: string;
}) {
  const now = new Date();
  const memberUserIds = [managerId, staffId].filter(Boolean) as string[];

  await db.transaction(async (tx) => {
    if (memberUserIds.length) {
      await tx.delete(businessMembers).where(
        and(
          eq(businessMembers.businessId, businessId),
          inArray(businessMembers.userId, memberUserIds),
        ),
      );
    }

    if (managerId) {
      await tx.insert(businessMembers).values({
        id: createSeededId("seed_bm", "manager"),
        businessId,
        userId: managerId,
        role: "manager",
        createdAt: now,
        updatedAt: now,
      });
    }

    if (staffId) {
      await tx.insert(businessMembers).values({
        id: createSeededId("seed_bm", "staff"),
        businessId,
        userId: staffId,
        role: "staff",
        createdAt: now,
        updatedAt: now,
      });
    }
  });
}

async function main() {
  console.log("Starting plan-based demo seed...\n");

  console.log("Cleaning up existing seed data...");
  const seedEmails = planUserConfigs.map((c) => c.email.toLowerCase());
  const teamEmails = teamMembers.map((m) => m.email.toLowerCase());
  const allSeedEmails = [...seedEmails, ...teamEmails];

  await db.transaction(async (tx) => {
    const seedUsers = await tx
      .select({ id: user.id })
      .from(user)
      .where(inArray(user.email, allSeedEmails));
    const seedUserIds = seedUsers.map((u) => u.id);

    if (seedUserIds.length > 0) {
      const userWorkspaces = await tx
        .select({ workspaceId: workspaceMembers.workspaceId })
        .from(workspaceMembers)
        .where(inArray(workspaceMembers.userId, seedUserIds));
      const workspaceIds = userWorkspaces.map((w) => w.workspaceId);

      if (workspaceIds.length > 0) {
        const userBusinesses = await tx
          .select({ id: businesses.id })
          .from(businesses)
          .where(inArray(businesses.workspaceId, workspaceIds));
        const businessIds = userBusinesses.map((b) => b.id);

        if (businessIds.length > 0) {
          await tx.delete(activityLogs).where(
            inArray(activityLogs.businessId, businessIds),
          );
          await tx.delete(inquiryNotes).where(
            inArray(inquiryNotes.businessId, businessIds),
          );
          await tx.delete(knowledgeFaqs).where(
            inArray(knowledgeFaqs.businessId, businessIds),
          );
          await tx.delete(replySnippets).where(
            inArray(replySnippets.businessId, businessIds),
          );
          await tx.delete(quoteItems).where(
            inArray(quoteItems.businessId, businessIds),
          );
          await tx.delete(quotes).where(
            inArray(quotes.businessId, businessIds),
          );
          await tx.delete(inquiries).where(
            inArray(inquiries.businessId, businessIds),
          );
          await tx.delete(businessInquiryForms).where(
            inArray(businessInquiryForms.businessId, businessIds),
          );
          await tx.delete(businessMembers).where(
            inArray(businessMembers.businessId, businessIds),
          );
          await tx.delete(businesses).where(
            inArray(businesses.id, businessIds),
          );
        }

        await tx.delete(workspaceMembers).where(
          inArray(workspaceMembers.workspaceId, workspaceIds),
        );
        await tx.delete(workspaces).where(
          inArray(workspaces.id, workspaceIds),
        );
      }

      await tx.delete(businessMembers).where(
        inArray(businessMembers.userId, seedUserIds),
      );
      await tx.delete(workspaceMembers).where(
        inArray(workspaceMembers.userId, seedUserIds),
      );
      await tx.delete(profiles).where(inArray(profiles.userId, seedUserIds));
      await tx.delete(user).where(inArray(user.id, seedUserIds));
    }
  });
  console.log("Cleanup complete.\n");

  const seededUsers: Array<{
    user: DemoUser;
    business: DemoBusiness;
    config: PlanUserConfig;
    counts: BusinessSeedCounts;
  }> = [];

  for (const config of planUserConfigs) {
    console.log(`Creating ${config.plan} user: ${config.email}`);

    const demoUser = await ensurePlanUser(config);
    const business = await ensurePrimaryBusiness(demoUser, config);
    const counts = await seedBusinessData(demoUser, business, config.plan);

    let managerUser: DemoUser | undefined;
    let staffUser: DemoUser | undefined;

    if (config.hasSecondaryBusiness) {
      const secondaryBusiness = await ensureSecondaryBusiness(
        demoUser,
        secondaryBusinessDefinition,
      );
      await seedSecondaryBusinessData(
        demoUser,
        secondaryBusiness,
        secondaryBusinessDefinition.key,
      );

      console.log(`Creating team members for ${config.email}`);
      managerUser = await ensureTeamMember(
        demoUser,
        teamMembers[0].name,
        teamMembers[0].email,
        teamMembers[0].role,
      );
      staffUser = await ensureTeamMember(
        demoUser,
        teamMembers[1].name,
        teamMembers[1].email,
        teamMembers[1].role,
      );

      await syncBusinessMembers({
        owner: demoUser,
        businessId: secondaryBusiness.id,
        managerId: managerUser.id,
        staffId: staffUser.id,
      });
    }

    seededUsers.push({
      user: demoUser,
      business,
      config,
      counts,
    });
  }

  console.log("\n=== Demo seed complete ===\n");
  console.log("Users created:");
  for (const { user, business, config, counts } of seededUsers) {
    const dashboardUrl = new URL(
      `/businesses/${business.slug}/dashboard`,
      env.BETTER_AUTH_URL,
    ).toString();
    const inquiryUrl = new URL(
      `/inquire/${business.slug}`,
      env.BETTER_AUTH_URL,
    ).toString();

    console.log(`\n[${config.plan.toUpperCase()}] ${user.email}`);
    console.log(`  Password: ${DEFAULT_PASSWORD}`);
    console.log(`  Business: ${business.name} (${business.slug})`);
    console.log(`  Plan: ${config.plan}`);
    console.log(`  Inquiries: ${counts.inquiries}, Quotes: ${counts.quotes}`);
    console.log(`  Dashboard: ${dashboardUrl}`);
    console.log(`  Public inquiry: ${inquiryUrl}`);

    if (config.hasSecondaryBusiness) {
      console.log(`  Team members: ${teamMembers.map((m) => m.email).join(", ")}`);
    }
  }

  console.log("\n" + "=".repeat(40));
  console.log("\nAll demo users use password: " + DEFAULT_PASSWORD);
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
