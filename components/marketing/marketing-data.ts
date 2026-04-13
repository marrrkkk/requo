import type { LucideIcon } from "lucide-react";
import {
  Clock3,
  FileText,
  Globe2,
  Inbox,
  Sparkles,
  Upload,
} from "lucide-react";

import { starterTemplateLabels } from "@/features/businesses/starter-templates";

export const navItems = [
  { href: "#why-requo", label: "Why Requo" },
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
] as const;

export const audienceSegments = starterTemplateLabels;

export const heroSignals = [
  {
    label: "Inbound capture",
    value: "Forms, referrals, ads, socials, and directory leads",
  },
  {
    label: "Lead qualification",
    value: "Collect scope, timing, budget, and files before pricing",
  },
  {
    label: "Quotes and follow-up",
    value: "Send professional quotes and keep the next step visible",
  },
] as const;

export const proofItems = [
  {
    title: "One owner dashboard",
    description:
      "Keep inbound inquiries, qualification notes, quote prep, and follow-up in one place instead of bouncing between tabs.",
  },
  {
    title: "Scoped public pages",
    description:
      "Use a clean inquiry page for lead capture and a clean quote page for customer response without exposing private data.",
  },
  {
    title: "Lead-to-quote context stays connected",
    description:
      "See whether a lead still needs qualification, a quote is in progress, or a customer is waiting on follow-up without rebuilding the story.",
  },
  {
    title: "Practical reply drafts",
    description:
      "Draft concise qualification and follow-up replies from inquiry details, owner notes, FAQs, and uploaded knowledge.",
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
    title: "Capture complete inquiries earlier",
    description:
      "Public inquiry pages collect files, timing, budget, and scope before the owner starts chasing missing context.",
  },
  {
    icon: Inbox,
    title: "Qualify before you price",
    description:
      "Review fit, confirm details, and keep qualification notes attached to the lead instead of buried in email.",
  },
  {
    icon: FileText,
    title: "Keep quotes and follow-up connected",
    description:
      "Quotes stay tied to the original inquiry, so pricing, customer responses, and the next follow-up live in one thread.",
  },
] as const;

export const whyBeforeItems = [
  "New leads arrive from forms, referrals, ads, socials, and directories.",
  "Qualification questions live in inbox threads, docs, and memory.",
  "Quotes and follow-up depend on old templates, spreadsheets, and manual reminders.",
] as const;

export const whyAfterItems = [
  "Each inquiry arrives with the key scope details and files attached.",
  "Qualification, quote prep, status, and follow-up stay attached to the same lead.",
  "The next action is visible from one calm owner dashboard.",
] as const;

export const whyOutcomeSignals = [
  "Faster qualification",
  "More consistent follow-up",
  "Calmer owner workflow",
] as const;

export const featureSummaryItems: readonly {
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    icon: Globe2,
    title: "Inquiry capture",
    description:
      "Collect the brief, files, timing, and budget from one clean inquiry page.",
  },
  {
    icon: Inbox,
    title: "Lead qualification queue",
    description:
      "See which inquiries need review, a quote, or a follow-up without living in email.",
  },
  {
    icon: FileText,
    title: "Professional quote workflow",
    description:
      "Keep pricing, quote status, and customer response attached to the same job.",
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
    meta: "Needs qualification",
    tone: "new",
  },
  {
    title: "Spring promo signage",
    detail: "Scope is confirmed and the quote draft is ready for final pricing.",
    meta: "Quote in progress",
    tone: "draft",
  },
  {
    title: "Menu board update",
    detail: "Customer viewed the quote and has not replied yet.",
    meta: "Follow up due",
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
    title: "Capture the inquiry",
    description:
      "Collect inbound requests from forms, referrals, ads, socials, or directories in one place.",
  },
  {
    title: "Qualify the lead",
    description:
      "Review fit, confirm scope, and gather the missing details before you price.",
  },
  {
    title: "Send the quote",
    description:
      "Build and send a professional quote with the original inquiry still attached.",
  },
  {
    title: "Follow up consistently",
    description:
      "Track customer response, quote status, and the next follow-up without relying on memory.",
  },
] as const;

export const workflowSummary = [
  "Capture inquiries",
  "Qualify leads",
  "Send quotes",
  "Follow up",
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
      "It is designed for owner-led service businesses, usually with lean teams, that handle inbound inquiries, custom quotes, and follow-up themselves.",
  },
  {
    question: "What do I get on day one?",
    answer:
      "A protected business dashboard, public inquiry capture, quote workflow, and the foundations for faster qualification and follow-up without setting up a complex system first.",
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
