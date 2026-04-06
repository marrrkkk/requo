import type { LucideIcon } from "lucide-react";
import {
  Clock3,
  FileText,
  Globe2,
  Inbox,
  MessageSquareText,
  Sparkles,
  Upload,
} from "lucide-react";

export const navItems = [
  { href: "#why-requo", label: "Why Requo" },
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "FAQ" },
] as const;

export const audienceSegments = [
  "Print shops",
  "Repair shops",
  "Tutors",
  "Event suppliers",
  "Small agencies",
] as const;

export const heroSignals = [
  {
    label: "Public intake",
    value: "Capture files, scope, budget, and timing",
  },
  {
    label: "Quote workflow",
    value: "Draft, send, and track the next response",
  },
  {
    label: "AI drafting",
    value: "Use your FAQs and knowledge files",
  },
] as const;

export const proofItems = [
  {
    title: "One owner dashboard",
    description:
      "Keep intake, quote prep, follow-up, and customer context in one place instead of bouncing between tabs.",
  },
  {
    title: "Scoped public pages",
    description:
      "Use a clean inquiry page for intake and a clean quote page for customer response without exposing private data.",
  },
  {
    title: "Quote status that stays visible",
    description:
      "See whether a quote is draft, sent, viewed, accepted, or waiting on the customer without rebuilding the story.",
  },
  {
    title: "Practical reply drafts",
    description:
      "Draft concise replies from inquiry details, owner notes, FAQs, and uploaded knowledge.",
  },
] as const;

export const painPoints = [
  {
    title: "Requests arrive incomplete",
    description:
      "Key files, timing, and scope details show up in fragments, so the first reply becomes another round of admin.",
  },
  {
    title: "Pricing is scattered",
    description:
      "Old docs, spreadsheets, and past emails become the quote system, which slows down every new job.",
  },
  {
    title: "Follow-up slips",
    description:
      "Customer replies, quote status, and next steps disappear across inboxes, tabs, and reminders you have to rebuild.",
  },
] as const;

export const whyRequoCards: readonly {
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    icon: Upload,
    title: "Get the right details earlier",
    description:
      "Public inquiry pages collect files, timing, budget, and scope before the owner starts chasing missing context.",
  },
  {
    icon: FileText,
    title: "Keep pricing attached to the job",
    description:
      "Quotes stay tied to the original request, so pricing, notes, and the next customer response live in one thread.",
  },
  {
    icon: MessageSquareText,
    title: "Make the next follow-up obvious",
    description:
      "The queue and quote states show whether to reply, send, or wait instead of making the owner reconstruct status from memory.",
  },
] as const;

export const whyBeforeItems = [
  "Customer details are split across forms, emails, and attachments.",
  "Pricing lives in old docs, spreadsheets, or past quotes.",
  "Follow-up depends on inbox memory and manual reminders.",
] as const;

export const whyAfterItems = [
  "The inquiry arrives with the project brief and files attached.",
  "Quote prep, status, and customer response stay connected.",
  "The next action is visible from one owner dashboard.",
] as const;

export const whyOutcomeSignals = [
  "Fewer back-and-forth emails",
  "Clearer quote handoff",
  "Calmer owner workflow",
] as const;

export const featureSummaryItems: readonly {
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    icon: Globe2,
    title: "Inquiry intake",
    description:
      "Collect the brief, files, budget, and timing on one clean public form.",
  },
  {
    icon: Inbox,
    title: "Owner queue",
    description:
      "See what needs a reply, a quote, or a follow-up without living in email.",
  },
  {
    icon: FileText,
    title: "Quote workflow",
    description:
      "Keep pricing, status, and the customer response attached to the same job.",
  },
  {
    icon: Sparkles,
    title: "AI draft help",
    description:
      "Start replies from your own notes, FAQs, and knowledge files instead of a blank box.",
  },
] as const;

export const featureFormFields = [
  { label: "Your name", value: "Taylor Nguyen" },
  { label: "Email address", value: "taylor@harborroast.co" },
  { label: "Service or category", value: "Storefront window graphics" },
  { label: "Budget", value: "Around $1,500" },
  { label: "Timing", value: "Install next week" },
] as const;

export const featureFormUploads = ["front-window.jpg", "logo.pdf"] as const;

export const featureQueueItems = [
  {
    title: "Window graphics refresh",
    detail: "Customer sent photos and needs install next week.",
    meta: "New inquiry",
    tone: "new",
  },
  {
    title: "Spring promo signage",
    detail: "Quote draft is ready for final pricing review.",
    meta: "Quote draft",
    tone: "draft",
  },
  {
    title: "Menu board update",
    detail: "Customer viewed the quote and has not replied yet.",
    meta: "Waiting",
    tone: "waiting",
  },
] as const;

export const featureKnowledgeItems = [
  "Install lead times",
  "Material options",
  "Artwork prep notes",
  "Common pricing questions",
] as const;

export const workflowSteps = [
  {
    title: "Customer sends a request",
    description:
      "They use your inquiry page and attach the files and details you need.",
  },
  {
    title: "You prepare the quote",
    description:
      "You review the job, price it, and send the quote from one dashboard.",
  },
  {
    title: "Customer reviews and replies",
    description:
      "They open a clean quote page, respond there, and the next step stays visible.",
  },
] as const;

export const workflowSummary = [
  "Request comes in",
  "Quote goes out",
  "Response stays tracked",
] as const;

export const faqItems = [
  {
    question: "Does Requo replace my inbox?",
    answer:
      "It replaces the scattered workflow around your inbox. You still receive customer communication, but the inquiry, quote, and next action stay organized in Requo.",
  },
  {
    question: "Can customers submit files with their inquiry?",
    answer:
      "Yes. Public inquiry pages can collect attachments alongside the request details so the owner has more context upfront.",
  },
  {
    question: "Can I send a quote and track the response?",
    answer:
      "Yes. Quotes move through draft, sent, accepted, rejected, expired, and follow-up states so the next step stays obvious.",
  },
  {
    question: "What does the AI use when it drafts a reply?",
    answer:
      "It uses the inquiry context, owner notes, FAQs, and uploaded knowledge files. The goal is a practical first draft, not generic filler.",
  },
  {
    question: "Who is Requo built for?",
    answer:
      "It is designed for owner-operated service businesses that handle inquiries, pricing, and follow-up themselves or with a very small team.",
  },
  {
    question: "What do I get on day one?",
    answer:
      "A protected business dashboard, public intake, quote workflow, and the foundations for faster follow-up without setting up a complex system first.",
  },
] as const;

export const inquiryChecklist = [
  "Need two front-window vinyl panels",
  "Customer uploaded storefront photos",
  "Wants install next week if possible",
] as const;

export const replyDraftLines = [
  "Thanks for sending the photos and rough measurements.",
  "We can quote two vinyl options and suggest the fastest install window.",
  "If you confirm the final sizes, we can send the quote next.",
] as const;

export const quoteLineItems = [
  { label: "Front window graphics", value: "2 panels" },
  { label: "Install", value: "Next-week slot" },
  { label: "Artwork update", value: "Included" },
] as const;

export const heroDetails: readonly {
  icon: LucideIcon;
  label: string;
  value: string;
}[] = [
  {
    icon: Upload,
    label: "Files",
    value: "Storefront photos attached",
  },
  {
    icon: Clock3,
    label: "Timing",
    value: "Install next week",
  },
];
