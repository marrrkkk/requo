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
    description: "Draft and send a clear quote while the request is still warm.",
    icon: FileSignature,
  },
  {
    title: "Follow up",
    description: "Automatic reminders keep good opportunities moving.",
    icon: Search,
  },
  {
    title: "Win",
    description: "See what was accepted and turn it into the next job step.",
    icon: Send,
  },
] as const;

export type LandingFeatureId =
  | "inquiries"
  | "quotes"
  | "ai"
  | "followUps"
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
    id: "followUps",
    title: "Follow-ups run on schedule, automatically.",
    description:
      "Requo creates follow-ups when quotes go quiet and reminds you before they expire. The system handles repetitive tasks so you can focus on closing deals.",
  },
] as const;

export const faqItems = [
  {
    question: "What exactly does Requo do?",
    answer:
      "Requo helps owner-led service businesses turn inquiries into quotes without losing the next step. Capture customer requests, draft quotes with AI, send them through Requo or share a public link, track responses, and follow up automatically before opportunities go cold.",
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
    question: "Who is Requo for?",
    answer:
      "Requo is built for owner-led service businesses that receive custom inquiries and prepare custom-scope quotes. If customers reach out to ask for pricing before committing, and you write up a quote specific to their request, Requo helps you respond faster and follow up before they choose someone else. Appointment-first businesses with fixed services aren't the primary fit.",
  },
  {
    question: "Is there a free plan?",
    answer:
      "Yes. The free plan includes the full workflow with enough capacity to test everything. Upgrade to Pro or Business when you need higher limits, team access, or advanced AI features.",
  },
] as const;
