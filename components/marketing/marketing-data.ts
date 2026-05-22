import type { LucideIcon } from "lucide-react";
import { FileText, Inbox, Upload, Search, FileSignature, Send } from "lucide-react";

export const navItems = [
  { pathname: "/", hash: "why-requo", label: "Why Requo" },
  { pathname: "/", hash: "workflow", label: "How it works" },
  { pathname: "/", hash: "features", label: "Features" },
  { pathname: "/", hash: "faq", label: "FAQ" },
  { pathname: "/pricing", label: "Pricing" },
] as const;

export type MarketingNavItem = (typeof navItems)[number];

export function getMarketingNavHref(item: MarketingNavItem) {
  return "hash" in item
    ? {
        pathname: item.pathname,
        hash: item.hash,
      }
    : item.pathname;
}

export function getMarketingNavKey(item: MarketingNavItem) {
  return "hash" in item ? `${item.pathname}#${item.hash}` : item.pathname;
}

export const resourceLinks = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Refund Policy", href: "/refund-policy" },
] as const;

export type ResourceLink = (typeof resourceLinks)[number];

export const whyPoints: readonly {
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    icon: Upload,
    title: "Details split fast",
    description:
      "A lead starts in email, phone, DMs, or a form. Scope, files, timing, and budget end up in different places.",
  },
  {
    icon: FileText,
    title: "Quotes slow down",
    description:
      "Before pricing, you rebuild the job story. That delay gives ready customers time to cool off or go elsewhere.",
  },
  {
    icon: Inbox,
    title: "After acceptance, nothing connects",
    description:
      "Work tracking, invoicing, and follow-ups live in separate tools or not at all. Context drops the moment the customer says yes.",
  },
] as const;

export const workflowSteps: readonly {
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    title: "Capture",
    description: "Keep every request in one place.",
    icon: Inbox,
  },
  {
    title: "Quote",
    description: "AI drafts, you review and send.",
    icon: FileSignature,
  },
  {
    title: "Win",
    description: "Track viewed, accepted, rejected.",
    icon: Search,
  },
  {
    title: "Deliver",
    description: "Jobs, invoices, follow-up. All connected.",
    icon: Send,
  },
] as const;

export type LandingFeatureId =
  | "inquiries"
  | "quotes"
  | "jobs"
  | "ai"
  | "analytics";

export const landingFeatureItems: readonly {
  id: LandingFeatureId;
  title: string;
  description: string;
  previewTitle: string;
  previewDescription: string;
}[] = [
  {
    id: "inquiries",
    title: "One inbox for every customer request.",
    description:
      "Capture inquiries from your public form or add them manually from calls, DMs, and referrals. AI detects duplicates and extracts key details so you can qualify faster.",
    previewTitle: "Inquiries",
    previewDescription:
      "Filter by status and jump straight into the request.",
  },
  {
    id: "quotes",
    title: "AI-drafted quotes from your pricing library.",
    description:
      "Turn any inquiry into a professional quote in minutes. AI matches line items from your saved pricing, past quotes, and business knowledge. You review and send.",
    previewTitle: "Quote #1042",
    previewDescription:
      "AI drafts, you review. Matched pricing shows confidence levels.",
  },
  {
    id: "jobs",
    title: "Track work after the customer says yes.",
    description:
      "Accepted quotes become trackable jobs with work item checklists. Check off progress, mark complete, and generate an invoice, all connected to the original quote.",
    previewTitle: "Jobs & Invoices",
    previewDescription:
      "From accepted quote to paid invoice in one flow.",
  },
  {
    id: "ai",
    title: "An AI assistant that knows your business.",
    description:
      "Ask anything about your inquiries, quotes, and performance. The assistant uses your pricing library, past quotes, and saved knowledge to draft, answer, and suggest next steps.",
    previewTitle: "Requo AI",
    previewDescription:
      "Ask questions, get insights, and take action from one conversation.",
  },
  {
    id: "analytics",
    title: "See what is working, what is stuck.",
    description:
      "Track inquiries, quotes sent, accepted, follow-ups due, and revenue across 7 days, 30 days, or 12 months. Know which deals need attention before they go cold.",
    previewTitle: "Workflow analytics",
    previewDescription:
      "Switch the range and watch the funnel respond.",
  },
] as const;

export const faqItems = [
  {
    question: "What exactly does Requo do?",
    answer:
      "Requo runs the full workflow from customer request to paid invoice. Capture inquiries, generate AI-drafted quotes, share a link, track who viewed and accepted, manage work items, and create invoices. All connected.",
  },
  {
    question: "Do my customers need to sign up to open a quote?",
    answer:
      "No. Every quote has a public link. Customers open it on any device, view the details, and accept or reject it in one tap.",
  },
  {
    question: "Can I add inquiries that came from calls, DMs, or referrals?",
    answer:
      "Yes. Post a public form for inbound requests, or add one manually in seconds with the customer name, the request, and any files. AI detects duplicates automatically.",
  },
  {
    question: "How does the AI quote generation work?",
    answer:
      "When you start a quote from an inquiry, AI matches line items from your pricing library, past quotes, and saved business knowledge. You review the draft, adjust anything, and send. Items are labeled with confidence levels so you know what was matched vs. estimated.",
  },
  {
    question: "How do I know when a quote is viewed or needs a follow-up?",
    answer:
      "Each quote tracks viewed, accepted, rejected, expired, and voided states. Follow-ups show up as tasks with suggested timing so you can nudge customers before the job goes cold.",
  },
  {
    question: "Does Requo send emails or do I share the link myself?",
    answer:
      "Both. Send the quote through Requo with a hosted email, or copy the link and share through WhatsApp, Messenger, SMS, or any channel you already use.",
  },
  {
    question: "What happens after a customer accepts?",
    answer:
      "The quote moves into post-acceptance. Track work items with a checklist, mark the job complete, and generate an invoice directly from the accepted quote. All connected without switching tools.",
  },
  {
    question: "Can my team work inside the same business?",
    answer:
      "Yes on the Team plan. Invite members so everyone sees the same inquiries, quotes, jobs, and follow-ups. Owner-led businesses can stay on the solo plan.",
  },
  {
    question: "Can I run more than one business from one account?",
    answer:
      "Yes. One login, separate businesses. Each has its own inquiries, quotes, forms, pricing library, and branding, with one subscription on your account.",
  },
  {
    question: "Is there a free plan?",
    answer:
      "Yes. Start free with enough to run the full workflow end to end. Upgrade when you need higher limits, team access, or advanced AI features.",
  },
] as const;
