import "dotenv/config";

import { and, asc, eq, inArray, ne } from "drizzle-orm";

import { getStarterTemplateDefinition } from "../features/businesses/starter-templates";
import type { BusinessType } from "../features/inquiries/business-types";
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
  key: string;
  id: string;
  kind: "primary" | "managed";
  name: string;
  slug: string;
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
  kind: "primary" | "managed";
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

const demoBusinessDefinitions: DemoBusinessDefinition[] = [
  {
    key: "primary",
    kind: "primary",
    name: demoConfig.businessName,
    slug: demoConfig.businessSlug,
    businessType: "print_signage",
    shortDescription:
      "Neighborhood print production for storefront graphics, menus, flyers, and event materials.",
    inquiryHeadline:
      "Tell us what you need printed and we will turn it into a clean quote.",
    emailSignatureLines: [
      demoConfig.ownerName,
      demoConfig.businessName,
      demoConfig.ownerEmail,
      "Same-week rush windows available when files are ready.",
    ],
    defaultQuoteNotes:
      "Prices include standard production. Installation, delivery, and rush changes are quoted separately when needed.",
    aiTonePreference: "warm",
    defaultCurrency: "USD",
    inquiryCount: 220,
    quoteNumberStart: 2001,
    forms: [
      {
        key: "project",
        name: "Project request",
        slug: "project-request",
        businessType: "print_signage",
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
          "Please scope {category} for {company}. Files are partly ready and we want help confirming print specs.",
          "Looking for a quote on {category} with practical recommendations on finishes, install, and lead time.",
        ],
        budgetOptions: ["$750-$1,500", "$1,500-$3,000", "$3,000+", null],
      },
      {
        key: "reorders",
        name: "Reorder request",
        slug: "reorder-request",
        businessType: "print_signage",
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
          "This is a repeat order for {category}. Please match the last run and confirm current turnaround.",
          "We need a fresh quote for {category} with updated quantities and the same finish as our previous order.",
          "Please price a fast reorder of {category} and flag any file or minimum-order changes we should know about.",
        ],
        budgetOptions: ["$250-$500", "$500-$1,000", "$1,000-$2,500", null],
      },
      {
        key: "install",
        name: "Install request",
        slug: "install-request",
        businessType: "print_signage",
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
          "Help with {category} production and install",
        ],
        detailTemplates: [
          "Need help quoting {category} with site install and a realistic scheduling window.",
          "Please estimate {category}. We already have measurements but need production and install coordinated.",
          "Looking for a quote on {category} with hardware, labor, and cleanup included.",
        ],
        budgetOptions: ["$1,000-$2,500", "$2,500-$5,000", "$5,000+", null],
      },
    ],
  },
  {
    key: "northline",
    kind: "managed",
    name: "Northline Home Services",
    slug: "northline-home-services",
    businessType: "contractor_home_improvement",
    shortDescription:
      "Reliable repair, install, and recurring maintenance work for homes and small property portfolios.",
    inquiryHeadline:
      "Describe the work, urgency, and site details and we will scope the right next step.",
    emailSignatureLines: [
      demoConfig.ownerName,
      "Northline Home Services",
      demoConfig.ownerEmail,
      "Licensed field support with clear windows and practical estimates.",
    ],
    defaultQuoteNotes:
      "Estimates cover listed labor and standard materials. Permit work, haul-away, and after-hours service are quoted separately when required.",
    aiTonePreference: "direct",
    defaultCurrency: "USD",
    inquiryCount: 190,
    quoteNumberStart: 3001,
    forms: [
      {
        key: "service",
        name: "Service request",
        slug: "service-request",
        businessType: "contractor_home_improvement",
        isDefault: true,
        distributionWeight: 50,
        serviceCategories: [
          "Water heater replacement",
          "HVAC tune-up",
          "Electrical troubleshooting",
          "Drywall repair",
          "Fixture install",
        ],
        subjectTemplates: [
          "{category} request for {company}",
          "Need help with {category}",
          "{company} needs a quote for {category}",
        ],
        detailTemplates: [
          "We need help with {category} and want a practical scope, timing, and rough cost range.",
          "Please quote {category} for {company}. Access is straightforward and we can share photos before scheduling.",
          "Looking for a clear estimate on {category}, including labor, materials, and the soonest available visit.",
        ],
        budgetOptions: ["$250-$750", "$750-$1,500", "$1,500-$3,500", null],
      },
      {
        key: "maintenance",
        name: "Maintenance plan request",
        slug: "maintenance-plan-request",
        businessType: "contractor_home_improvement",
        isDefault: false,
        distributionWeight: 25,
        serviceCategories: [
          "Seasonal inspection",
          "Preventive maintenance",
          "Rental turnover checklist",
          "Recurring handyman visits",
        ],
        subjectTemplates: [
          "{company} recurring support request",
          "Looking for a quote on {category}",
          "Maintenance pricing for {category}",
        ],
        detailTemplates: [
          "We are evaluating ongoing support and need pricing for {category} with a reliable response window.",
          "Please quote {category} for a property that needs recurring visits and simple reporting after each visit.",
          "Looking for a maintenance option around {category} with practical scheduling and clear inclusions.",
        ],
        budgetOptions: ["$300-$900", "$900-$1,800", "$1,800+", null],
      },
      {
        key: "emergency",
        name: "After-hours repair",
        slug: "after-hours-repair",
        businessType: "contractor_home_improvement",
        isDefault: false,
        distributionWeight: 25,
        serviceCategories: [
          "Leak investigation",
          "Breaker issue",
          "No-heat call",
          "Urgent lock repair",
        ],
        subjectTemplates: [
          "Urgent help needed for {category}",
          "{company} after-hours request",
          "Need a rapid quote for {category}",
        ],
        detailTemplates: [
          "This is time-sensitive. We need help with {category} and want to confirm response time and emergency pricing.",
          "Please quote {category}. We can share photos now and arrange access immediately if needed.",
          "Looking for urgent support on {category} with a realistic arrival window and next-step guidance.",
        ],
        budgetOptions: ["$250-$500", "$500-$1,000", "$1,000+", null],
      },
    ],
  },
  {
    key: "summit",
    kind: "managed",
    name: "Summit Creative Studio",
    slug: "summit-creative-studio",
    businessType: "creative_marketing_services",
    shortDescription:
      "Brand, design, and launch support for small teams that need calm project delivery and practical creative ops.",
    inquiryHeadline:
      "Share the brief, goals, and timeline and we will shape the right creative scope.",
    emailSignatureLines: [
      demoConfig.ownerName,
      "Summit Creative Studio",
      demoConfig.ownerEmail,
      "Brand systems, launch design, and retained creative support.",
    ],
    defaultQuoteNotes:
      "Quotes include listed concepting, production, and revision rounds. Strategy workshops, extra revision cycles, and out-of-scope requests are quoted separately.",
    aiTonePreference: "balanced",
    defaultCurrency: "USD",
    inquiryCount: 170,
    quoteNumberStart: 4001,
    forms: [
      {
        key: "brief",
        name: "Project brief",
        slug: "project-brief",
        businessType: "creative_marketing_services",
        isDefault: true,
        distributionWeight: 45,
        serviceCategories: [
          "Brand identity refresh",
          "Launch campaign",
          "Sales deck design",
          "Packaging concept",
          "Website copy and layout",
        ],
        subjectTemplates: [
          "{company} brief for {category}",
          "Need a proposal for {category}",
          "{category} support request",
        ],
        detailTemplates: [
          "We need support on {category} and want a scoped proposal with timeline, deliverables, and revision expectations.",
          "Please quote {category} for {company}. We have a rough brief and need help tightening the approach.",
          "Looking for a calm, production-ready quote on {category} with clear phases and handoff expectations.",
        ],
        budgetOptions: ["$1,000-$3,000", "$3,000-$7,500", "$7,500+", null],
      },
      {
        key: "retainer",
        name: "Retainer inquiry",
        slug: "retainer-inquiry",
        businessType: "creative_marketing_services",
        isDefault: false,
        distributionWeight: 30,
        serviceCategories: [
          "Monthly design support",
          "Campaign iteration",
          "Creative operations help",
          "Content production support",
        ],
        subjectTemplates: [
          "{company} retainer request",
          "Ongoing support for {category}",
          "Need monthly help with {category}",
        ],
        detailTemplates: [
          "We are looking for ongoing support around {category} and want pricing that reflects a steady monthly cadence.",
          "Please quote {category} with a retainer structure, expected turnaround, and communication rhythm.",
          "Looking for continuous help on {category} with a realistic scope and priority SLA.",
        ],
        budgetOptions: ["$1,500-$3,500", "$3,500-$6,000", "$6,000+", null],
      },
      {
        key: "web",
        name: "Website refresh",
        slug: "website-refresh",
        businessType: "creative_marketing_services",
        isDefault: false,
        distributionWeight: 25,
        serviceCategories: [
          "Marketing site refresh",
          "Landing page sprint",
          "Conversion copy update",
          "Design system cleanup",
        ],
        subjectTemplates: [
          "{company} website refresh request",
          "Need a quote for {category}",
          "{category} project inquiry",
        ],
        detailTemplates: [
          "We need help with {category} and want a quote that covers design, copy, and implementation guidance.",
          "Please scope {category} for {company}. We want a practical update that lifts clarity and conversion.",
          "Looking for pricing on {category} with fast feedback loops and a clean handoff into build.",
        ],
        budgetOptions: ["$2,000-$5,000", "$5,000-$10,000", "$10,000+", null],
      },
    ],
  },
  {
    key: "ironwood",
    kind: "managed",
    name: "Ironwood Custom Fabrication",
    slug: "ironwood-custom-fabrication",
    businessType: "fabrication_custom_build",
    shortDescription:
      "Custom fabrication, millwork, and built-to-spec production for branded spaces, fixtures, and install-ready components.",
    inquiryHeadline:
      "Share the specs, material needs, and drawings and we will turn it into a practical quote.",
    emailSignatureLines: [
      demoConfig.ownerName,
      "Ironwood Custom Fabrication",
      demoConfig.ownerEmail,
      "Custom builds, fabrication support, and install-ready production.",
    ],
    defaultQuoteNotes:
      "Quotes cover listed fabrication, standard finishing, and shop handling. Site install, engineering review, freight, and specialty materials are scoped separately when needed.",
    aiTonePreference: "direct",
    defaultCurrency: "USD",
    inquiryCount: 155,
    quoteNumberStart: 5001,
    forms: [
      {
        key: "quote",
        name: "Quote request",
        slug: "quote-request",
        businessType: "fabrication_custom_build",
        isDefault: true,
        distributionWeight: 55,
        serviceCategories: [
          "Retail display fabrication",
          "Custom millwork package",
          "Metal sign frame build",
          "Fixture production",
          "Reception desk build",
        ],
        subjectTemplates: [
          "{company} quote request for {category}",
          "Need pricing on {category}",
          "{category} fabrication scope for {company}",
        ],
        detailTemplates: [
          "We need a quote for {category} and want help confirming material, finish, and production timing.",
          "Please scope {category} for {company}. We can share sketches and dimensions but need practical pricing guidance.",
          "Looking for a fabrication quote on {category} with clear assumptions around materials, finishing, and install coordination.",
        ],
        budgetOptions: ["$2,500-$6,000", "$6,000-$12,000", "$12,000+", null],
      },
      {
        key: "prototype",
        name: "Prototype request",
        slug: "prototype-request",
        businessType: "fabrication_custom_build",
        isDefault: false,
        distributionWeight: 25,
        serviceCategories: [
          "Prototype enclosure",
          "Sample display unit",
          "Custom bracket prototype",
          "One-off product mockup",
        ],
        subjectTemplates: [
          "{company} prototype inquiry",
          "Need a quote for {category}",
          "Prototype support for {category}",
        ],
        detailTemplates: [
          "We want to prototype {category} before moving into a larger run and need pricing plus realistic shop timing.",
          "Please quote {category} for {company}. This is an early prototype and we may need feedback on the best material path.",
          "Looking for a practical estimate on {category} with notes on what should change before production.",
        ],
        budgetOptions: ["$1,000-$2,500", "$2,500-$5,000", "$5,000+", null],
      },
      {
        key: "install",
        name: "Install coordination",
        slug: "install-coordination",
        businessType: "fabrication_custom_build",
        isDefault: false,
        distributionWeight: 20,
        serviceCategories: [
          "Fixture install",
          "Display install",
          "Site measurement and install",
          "Final fit-out support",
        ],
        subjectTemplates: [
          "{company} install support for {category}",
          "Need pricing on {category}",
          "{category} fabrication and install request",
        ],
        detailTemplates: [
          "Need help pricing {category} with site install and a realistic coordination window.",
          "Please scope {category}. Production is only part of the job, and we need install handling included.",
          "Looking for a quote on {category} with site access, install timing, and closeout covered clearly.",
        ],
        budgetOptions: ["$3,000-$7,500", "$7,500-$15,000", "$15,000+", null],
      },
    ],
  },
  {
    key: "northstar",
    kind: "managed",
    name: "Northstar Event Rentals",
    slug: "northstar-event-rentals",
    businessType: "event_services_rentals",
    shortDescription:
      "Event rentals, setup, and production coordination for brand activations, weddings, and corporate gatherings.",
    inquiryHeadline:
      "Tell us the date, venue, and service needs and we will shape a clear event quote.",
    emailSignatureLines: [
      demoConfig.ownerName,
      "Northstar Event Rentals",
      demoConfig.ownerEmail,
      "Event rentals, staffing, setup, and calm on-site coordination.",
    ],
    defaultQuoteNotes:
      "Quotes include listed rentals, setup windows, and standard breakdown. Delivery zones, venue restrictions, overtime, and custom sourcing are scoped separately when needed.",
    aiTonePreference: "warm",
    defaultCurrency: "USD",
    inquiryCount: 145,
    quoteNumberStart: 6001,
    forms: [
      {
        key: "event",
        name: "Event request",
        slug: "event-request",
        businessType: "event_services_rentals",
        isDefault: true,
        distributionWeight: 50,
        serviceCategories: [
          "Corporate event setup",
          "Wedding rentals",
          "Brand activation support",
          "Private dinner production",
          "Conference lounge package",
        ],
        subjectTemplates: [
          "{company} event request for {category}",
          "Need pricing on {category}",
          "{category} quote request",
        ],
        detailTemplates: [
          "We need help with {category} and want pricing for rentals, setup, and timing in one clean quote.",
          "Please scope {category} for {company}. We have a venue and rough guest count but need help locking the service mix.",
          "Looking for a clear estimate on {category} with practical notes on delivery, setup, and breakdown.",
        ],
        budgetOptions: ["$2,000-$5,000", "$5,000-$10,000", "$10,000+", null],
      },
      {
        key: "wedding",
        name: "Wedding rentals",
        slug: "wedding-rentals",
        businessType: "event_services_rentals",
        isDefault: false,
        distributionWeight: 30,
        serviceCategories: [
          "Ceremony seating",
          "Reception table package",
          "Lounge furniture rental",
          "Decor and styling support",
        ],
        subjectTemplates: [
          "Wedding quote for {category}",
          "{company} needs {category}",
          "Need pricing on {category} for an upcoming wedding",
        ],
        detailTemplates: [
          "Please quote {category} with delivery, setup, and pickup included where possible.",
          "We are planning a wedding and need practical pricing for {category} with guest count and venue timing in mind.",
          "Looking for a clean quote on {category}, including what works best for a fast venue turnaround.",
        ],
        budgetOptions: ["$1,500-$4,000", "$4,000-$8,000", "$8,000+", null],
      },
      {
        key: "activation",
        name: "Activation support",
        slug: "activation-support",
        businessType: "event_services_rentals",
        isDefault: false,
        distributionWeight: 20,
        serviceCategories: [
          "Popup launch setup",
          "Sampling booth package",
          "Stage and AV support",
          "Experiential event staffing",
        ],
        subjectTemplates: [
          "{company} activation request",
          "Need a quote for {category}",
          "{category} support request",
        ],
        detailTemplates: [
          "We need support for {category} and want a quote that covers setup, staff coordination, and breakdown.",
          "Please scope {category} for {company}. Timing is tight and we want practical recommendations, not just a rental list.",
          "Looking for a quote on {category} with a realistic delivery schedule and on-site support plan.",
        ],
        budgetOptions: ["$3,000-$7,500", "$7,500-$15,000", "$15,000+", null],
      },
    ],
  },
];

const primaryBusinessDefinition = demoBusinessDefinitions[0];
const managedBusinessDefinitions = demoBusinessDefinitions.filter(
  (definition) => definition.kind === "managed",
);

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

async function ensureDemoBusiness(demoUser: DemoUser): Promise<DemoBusiness> {
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

  const definition = primaryBusinessDefinition;
  const now = new Date();
  const slug = await getAvailableSlug(definition.slug, membership.businessId);
  const inquiryPreset = createInquiryFormPreset({
    businessType: definition.businessType,
    businessName: definition.name,
    businessShortDescription: definition.shortDescription,
    legacyInquiryHeadline: definition.inquiryHeadline,
  });
  const starterTemplate = getStarterTemplateDefinition(definition.businessType);

  await db
    .update(businesses)
    .set({
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
    definition,
    membership.businessId,
    defaultForm.id,
  );

  return {
    key: definition.key,
    id: membership.businessId,
    kind: definition.kind,
    name: definition.name,
    slug,
    defaultInquiryFormId: syncedForms.defaultInquiryFormId,
    quoteNumberStart: definition.quoteNumberStart,
    forms: syncedForms.forms,
  };
}

async function ensureManagedBusiness(
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

  await db.transaction(async (tx) => {
    if (existingBusiness) {
      await tx
        .update(businesses)
        .set({
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
    } else if (existingMembership.role !== "owner") {
      await tx
        .update(businessMembers)
        .set({
          role: "owner",
          updatedAt: now,
        })
        .where(eq(businessMembers.id, existingMembership.id));
    }

    await tx
      .insert(activityLogs)
      .values({
        id: createSeededId("seed_act", definition.key, "created"),
        businessId,
        actorUserId: demoUser.id,
        type: "business.created",
        summary: `Seed business ${definition.name} is ready for demo data.`,
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
    defaultInquiryFormId: syncedForms.defaultInquiryFormId,
    quoteNumberStart: definition.quoteNumberStart,
    forms: syncedForms.forms,
  };
}

function generateBulkInquiries(
  definition: DemoBusinessDefinition,
  business: DemoBusiness,
  count = definition.inquiryCount,
) {
  const random = createSeededRandom(`${definition.key}:inquiries`);
  const forms = definition.forms.map((formDefinition) => {
    const seededForm = business.forms[formDefinition.key];

    if (!seededForm) {
      throw new Error(
        `Business "${definition.key}" is missing the "${formDefinition.key}" form.`,
      );
    }

    return {
      ...formDefinition,
      id: seededForm.id,
    };
  });
  const inquiries: GeneratedInquiryRow[] = [];

  for (let index = 0; index < count; index += 1) {
    const form =
      pickWeighted(
        forms.map((formDefinition) => ({
          item: formDefinition,
          weight: formDefinition.distributionWeight,
        })),
        random,
      ) ?? forms[0];
    const firstName = pickOne(customerFirstNames, random);
    const lastName = pickOne(customerLastNames, random);
    const company = `${pickOne(companyPrefixes, random)} ${pickOne(
      companySuffixes,
      random,
    )}`;
    const serviceCategory = pickOne(form.serviceCategories, random);
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
        definition.key,
        String(index + 1).padStart(4, "0"),
      ),
      businessId: business.id,
      businessInquiryFormId: form.id,
      status,
      subject: fillTemplate(pickOne(form.subjectTemplates, random), {
        category: serviceCategory,
        company: companyLabel,
      }),
      customerName: `${firstName} ${lastName}`,
      customerEmail,
      customerPhone: chance(random, 0.72) ? formatPhoneNumber(random) : null,
      serviceCategory,
      requestedDeadline,
      budgetText: pickOne(form.budgetOptions, random),
      companyName,
      details: fillTemplate(pickOne(form.detailTemplates, random), {
        category: serviceCategory,
        company: companyLabel,
      }),
      source: `demo-seed-generated:${definition.key}`,
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
  definition: DemoBusinessDefinition,
  business: DemoBusiness,
  inquiryRows: GeneratedInquiryRow[],
) {
  const random = createSeededRandom(`${definition.key}:quotes`);
  const quoteRows: GeneratedQuoteRow[] = [];
  const quoteItemRows: GeneratedQuoteItemRow[] = [];
  let quoteNumber = definition.quoteNumberStart;
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
      definition.key,
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
      definition.businessType === "creative_marketing_services"
        ? "Creative production"
        : definition.businessType === "contractor_home_improvement"
          ? "Labor and materials"
          : definition.businessType === "fabrication_custom_build"
            ? "Fabrication and finishing"
            : definition.businessType === "event_services_rentals"
              ? "Setup and event operations"
          : "Production and execution",
      definition.businessType === "creative_marketing_services"
        ? "Revision and handoff"
        : definition.businessType === "fabrication_custom_build"
          ? "Installation and fit check"
          : definition.businessType === "event_services_rentals"
            ? "Breakdown and post-event support"
        : "Delivery and quality assurance",
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
          definition.key,
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
    const defaultValidUntil = addDays(
      sentAt ?? createdAt,
      randomInt(random, 7, 21),
    );
    const validUntilDate =
      quoteStatus === "expired"
        ? (() => {
            const expiredDate = addDays(createdAt, randomInt(random, 5, 12));
            return expiredDate.getTime() > Date.now()
              ? daysAgo(randomInt(random, 2, 30), 12, 0)
              : expiredDate;
          })()
        : defaultValidUntil;
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
      publicToken: createSeededId("seed_token", definition.key, String(quoteNumber)),
      title: fillTemplate(
        pickOne(
          [
            "{category} quote",
            "Estimate for {company}",
            "{company} {category} proposal",
          ],
          random,
        ),
        {
          category: inquiry.serviceCategory,
          company: inquiry.companyName ?? inquiry.customerName,
        },
      ),
      customerName: inquiry.customerName,
      customerEmail: inquiry.customerEmail,
      currency: definition.defaultCurrency,
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
  definition: DemoBusinessDefinition,
  business: DemoBusiness,
) {
  const inquiries = generateBulkInquiries(definition, business);
  const { quotes, quoteItems } = generateBulkQuoteData(
    definition,
    business,
    inquiries,
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

  const inquiryRows = [
    {
      id: demoInquiryIds[0],
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
      businessInquiryFormId: reorderFormId,
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
      businessInquiryFormId: projectFormId,
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
      businessInquiryFormId: projectFormId,
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
      businessInquiryFormId: reorderFormId,
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
      businessInquiryFormId: reorderFormId,
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
      businessInquiryFormId: installFormId,
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

  const generatedData = createGeneratedDataset(primaryBusinessDefinition, business);
  const bulkInquiries = generatedData.inquiries;
  const bulkQuotes = generatedData.quotes;
  const bulkQuoteItems = generatedData.quoteItems;

  // Combine bulk data with demo data
  const allInquiries = [...inquiryRows, ...bulkInquiries];
  const allQuotes = [...quoteRows, ...bulkQuotes];
  const allQuoteItems = [...quoteItemRows, ...bulkQuoteItems];

  console.log(
    `Seeding ${business.name}: ${allInquiries.length} inquiries, ${allQuotes.length} quotes, ${allQuoteItems.length} quote items.`,
  );

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

  return {
    inquiries: allInquiries.length,
    quotes: allQuotes.length,
    quoteItems: allQuoteItems.length,
  };
}

async function seedManagedBusinessData(
  demoUser: DemoUser,
  definition: DemoBusinessDefinition,
  business: DemoBusiness,
): Promise<BusinessSeedCounts> {
  const generatedData = createGeneratedDataset(definition, business);
  const seedActivityId = createSeededId("seed_act", definition.key, "seeded");

  console.log(
    `Seeding ${business.name}: ${generatedData.inquiries.length} inquiries, ${generatedData.quotes.length} quotes, ${generatedData.quoteItems.length} quote items.`,
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
        businessKey: definition.key,
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

async function main() {
  const demoUser = await ensureDemoUser();
  const business = await ensureDemoBusiness(demoUser);
  const seededBusinesses: Array<{
    business: DemoBusiness;
    counts: BusinessSeedCounts;
  }> = [
    {
      business,
      counts: await seedBusinessData(demoUser, business),
    },
  ];

  for (const definition of managedBusinessDefinitions) {
    const managedBusiness = await ensureManagedBusiness(demoUser, definition);
    const counts = await seedManagedBusinessData(
      demoUser,
      definition,
      managedBusiness,
    );

    seededBusinesses.push({
      business: managedBusiness,
      counts,
    });
  }

  const totals = seededBusinesses.reduce(
    (aggregate, entry) => ({
      inquiries: aggregate.inquiries + entry.counts.inquiries,
      quotes: aggregate.quotes + entry.counts.quotes,
      quoteItems: aggregate.quoteItems + entry.counts.quoteItems,
      forms: aggregate.forms + Object.keys(entry.business.forms).length,
    }),
    {
      inquiries: 0,
      quotes: 0,
      quoteItems: 0,
      forms: 0,
    },
  );

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
  console.log(`Businesses seeded: ${seededBusinesses.length}`);
  console.log(`Forms seeded: ${totals.forms}`);
  console.log(`Total inquiries: ${totals.inquiries}`);
  console.log(`Total quotes: ${totals.quotes}`);
  console.log(`Total quote items: ${totals.quoteItems}`);
  console.log("");
  for (const entry of seededBusinesses) {
    console.log(
      `- ${entry.business.name} (${entry.business.slug}) with ${Object.keys(entry.business.forms).length} forms`,
    );
  }
  console.log("");
  console.log(`Primary business: ${business.name}`);
  console.log(`Primary business slug: ${business.slug}`);
  console.log(`Demo owner email: ${demoUser.email}`);
  console.log(`Demo owner password: ${demoConfig.ownerPassword}`);
  console.log(`Dashboard URL: ${dashboardUrl}`);
  console.log(`Public inquiry URL: ${inquiryUrl}`);
  console.log("");
  console.log(
    "The script refreshes the fixed demo workspace and adds extra seed-managed businesses without touching unrelated businesses.",
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
