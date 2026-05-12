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
      "Before pricing, you rebuild the job story. That delay gives ready customers time to cool off.",
  },
  {
    icon: Inbox,
    title: "Follow-up gets missed",
    description:
      "After sending, viewed and undecided quotes need a next step. Memory is not a good system.",
  },
] as const;

export const workflowSteps: readonly {
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    title: "Capture",
    description: "Keep details in one place.",
    icon: Inbox,
  },
  {
    title: "Review",
    description: "See what is missing fast.",
    icon: Search,
  },
  {
    title: "Quote",
    description: "Build and send a clear quote.",
    icon: FileSignature,
  },
  {
    title: "Follow up",
    description: "Keep the next step visible.",
    icon: Send,
  },
] as const;

export type LandingFeatureId =
  | "inquiries"
  | "quotes"
  | "follow-ups"
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
      "Capture inquiries from your public form or add them manually from calls, DMs, and referrals. Filter by status to see what needs attention right now.",
    previewTitle: "Inquiries",
    previewDescription:
      "Filter by status and jump straight into the request.",
  },
  {
    id: "quotes",
    title: "Turn inquiries into quotes customers can open.",
    description:
      "Build a clear quote with line items, totals, notes, and an expiry. Share it as a link so customers can view, accept, or reject it right from their phone.",
    previewTitle: "Quote #1042",
    previewDescription:
      "A live preview that updates as you pick a draft to send.",
  },
  {
    id: "follow-ups",
    title: "Never lose a viewed quote to silence.",
    description:
      "Keep the next step visible with scheduled follow-ups, suggested messages, and one-tap complete, reschedule, or skip. Quotes do not cool off quietly.",
    previewTitle: "Follow-ups due",
    previewDescription:
      "Tap to mark done, reschedule, or skip a reminder.",
  },
  {
    id: "analytics",
    title: "See what is working, what is stuck.",
    description:
      "Track inquiries, quotes sent, accepted, and follow-ups due across 7 days, 30 days, or 12 months. A light analytics layer, not a full BI tool.",
    previewTitle: "Workflow analytics",
    previewDescription:
      "Switch the range and watch the funnel respond.",
  },
] as const;

export const faqItems = [
  {
    question: "What exactly does Requo do?",
    answer:
      "Requo runs the part between a customer asking and a customer saying yes. You capture inquiries, build a quote, share a link, and track who viewed, accepted, or went quiet so you can follow up.",
  },
  {
    question: "Do my customers need to sign up to open a quote?",
    answer:
      "No. Every quote has a public link. Customers open it on any device, view the details, and accept or reject it in one tap.",
  },
  {
    question: "Can I add inquiries that came from calls, DMs, or referrals?",
    answer:
      "Yes. You can post a public form and take in inquiries from anywhere, or add one manually in a few seconds with the customer name, the request, and any files.",
  },
  {
    question: "How do I know when a quote is viewed or needs a follow-up?",
    answer:
      "Each quote tracks viewed, accepted, rejected, expired, and voided states. Follow-ups show up as tasks with suggested copy so you can nudge customers before the job goes cold.",
  },
  {
    question: "Does Requo send emails or do I share the link myself?",
    answer:
      "Both. You can send the quote through Requo with a hosted email, or copy the link and share it through WhatsApp, Messenger, SMS, or any channel you already use.",
  },
  {
    question: "Can my team work inside the same business?",
    answer:
      "Yes on the Team plan. Invite members so everyone sees the same inquiries, quotes, statuses, and follow-ups. Owner-led businesses can stay on the solo plan.",
  },
  {
    question: "What happens after a customer accepts?",
    answer:
      "The quote moves into post-acceptance. You can mark the job as scheduled, request a deposit, or close it out as completed — without bolting on a full project management tool.",
  },
  {
    question: "Can I run more than one business from one account?",
    answer:
      "Yes. One login, separate businesses. Each has its own inquiries, quotes, forms, and branding, with one subscription on your account.",
  },
  {
    question: "Does Requo replace my CRM or invoicing tool?",
    answer:
      "No. Requo focuses on inquiry to accepted quote. Keep your invoicing or accounting tool for everything after the deposit — we stay lean on purpose.",
  },
  {
    question: "Is there a free plan?",
    answer:
      "Yes. Start free with enough to run the full workflow end to end. Upgrade when you need higher limits, team access, or advanced follow-up features.",
  },
] as const;
