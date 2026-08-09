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
    description: "Every inquiry in one place, nothing lost.",
    icon: Inbox,
  },
  {
    title: "Quote",
    description: "AI drafts, you review. Respond in minutes.",
    icon: FileSignature,
  },
  {
    title: "Follow up",
    description: "Automatic reminders keep deals moving.",
    icon: Search,
  },
  {
    title: "Win",
    description: "Track accepted, rejected, and convert to jobs.",
    icon: Send,
  },
] as const;

export type LandingFeatureId =
  | "inquiries"
  | "quotes"
  | "ai"
  | "automations"
  | "analytics";

export const landingFeatureItems: readonly {
  id: LandingFeatureId;
  title: string;
  description: string;
}[] = [
  {
    id: "inquiries",
    title: "Every customer request captured.",
    description:
      "Forms, phone calls, text messages, referrals — log them all in seconds. Filter by status, search by name, and move the best ones to quote instantly.",
  },
  {
    id: "quotes",
    title: "Send quotes in minutes, not days.",
    description:
      "AI matches line items from your pricing library and past quotes. You review the draft, make adjustments, and send. Professional quotes done faster.",
  },
  {
    id: "ai",
    title: "Ask questions, get instant answers.",
    description:
      "\"Which quotes are stale?\" \"Show me this week's inquiries.\" Your AI assistant pulls live data, answers in seconds, and suggests next actions.",
  },
  {
    id: "automations",
    title: "Follow-ups run on schedule, automatically.",
    description:
      "Set triggers for reminders, status updates, and customer nudges. The system handles repetitive tasks so you can focus on closing deals.",
  },
  {
    id: "analytics",
    title: "Know exactly where deals stall.",
    description:
      "Track your pipeline from first inquiry to accepted quote. See conversion rates, response times, and bottlenecks before opportunities go cold.",
  },
] as const;

export const faqItems = [
  {
    question: "What exactly does Requo do?",
    answer:
      "Requo manages your entire quote-to-invoice workflow. Capture customer requests, draft quotes with AI, send them out, track opens and acceptances, manage jobs, and generate invoices. Everything stays connected in one place.",
  },
  {
    question: "Do my customers need to sign up to open a quote?",
    answer:
      "No. Every quote gets a public link. Your customers open it on their phone or computer, review the details, and accept or reject with one tap. No account needed.",
  },
  {
    question: "Can I add inquiries that came from calls, DMs, or referrals?",
    answer:
      "Yes. Share your public form for inbound requests, or manually add inquiries in seconds. Include the customer name, request details, and any files. AI automatically flags potential duplicates.",
  },
  {
    question: "How does the AI quote generation work?",
    answer:
      "When you create a quote, AI pulls line items from your pricing library, past quotes, and business knowledge. You review the draft, adjust pricing or scope, and send. Confidence labels show which items were matched versus estimated.",
  },
  {
    question: "How do I know when a quote is viewed or needs a follow-up?",
    answer:
      "Every quote tracks its status: viewed, accepted, rejected, expired, or voided. Follow-up tasks appear automatically with suggested timing, so you can nudge customers before they go elsewhere.",
  },
  {
    question: "Does Requo send emails or do I share the link myself?",
    answer:
      "Both work. Send quotes through Requo's email system, or copy the link and share via WhatsApp, text message, Messenger, or whatever channel you already use with customers.",
  },
  {
    question: "What happens after a customer accepts?",
    answer:
      "Accepted quotes move into job management. Add a checklist to track progress, mark milestones complete, and generate an invoice directly from the quote line items when the work is done. No re-entering numbers.",
  },
  {
    question: "Can my team work inside the same business?",
    answer:
      "Yes, on the Business plan. Invite team members so everyone sees the same inquiries, quotes, jobs, and follow-ups. Solo operators can stay on the free or Pro plan.",
  },
  {
    question: "Can I run more than one business from one account?",
    answer:
      "Yes. One login manages multiple businesses. Each business has separate inquiries, quotes, forms, pricing libraries, and branding. One subscription covers all of them.",
  },
  {
    question: "Is there a free plan?",
    answer:
      "Yes. The free plan includes the full workflow with enough capacity to test everything. Upgrade to Pro or Business when you need higher limits, team access, or advanced AI features.",
  },
] as const;
