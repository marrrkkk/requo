import type { LucideIcon } from "lucide-react";
import { FileText, Inbox, Upload } from "lucide-react";

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
    title: "The request stays complete",
    description:
      "Keep the customer's details, files, timing, and scope tied to the same job instead of scattered across messages.",
  },
  {
    icon: FileText,
    title: "The quote keeps the same context",
    description:
      "Review the inquiry, write the quote, and keep the job story in view while you price the work.",
  },
  {
    icon: Inbox,
    title: "The next follow-up stays visible",
    description:
      "Know what still needs review, what has been quoted, and which lead needs the next nudge.",
  },
] as const;

export const workflowSteps = [
  {
    title: "Capture the request",
    description:
      "Collect a new inquiry from your public page or add the lead yourself when it comes in elsewhere.",
  },
  {
    title: "Review the fit",
    description:
      "Check scope, files, timing, and anything you need before you spend time pricing the work.",
  },
  {
    title: "Send the quote",
    description:
      "Prepare a clear quote with the inquiry details, notes, and attachments still attached.",
  },
  {
    title: "Follow up",
    description:
      "Track the response and keep the next follow-up visible after the quote goes out.",
  },
] as const;

export type LandingFeatureId =
  | "quotes"
  | "forms"
  | "analytics"
  | "collaboration";

export const landingFeatureItems: readonly {
  id: LandingFeatureId;
  title: string;
  description: string;
  previewTitle: string;
  previewDescription: string;
}[] = [
  {
    id: "quotes",
    title: "Send quotes faster.",
    description:
      "Build a clear quote without losing the job details. Customer info, scope, notes, and pricing stay together.",
    previewTitle: "Quote preview",
    previewDescription:
      "A draft quote with line items, totals, and a customer share view.",
  },
  {
    id: "forms",
    title: "Get better inquiry details upfront.",
    description:
      "Use simple forms to collect scope, timing, files, and the basics you need before you start quoting.",
    previewTitle: "Form preview",
    previewDescription:
      "A public form that collects the details you need.",
  },
  {
    id: "analytics",
    title: "See what needs follow-up.",
    description:
      "Track inquiries, quotes, and replies so you know what is moving and what needs attention.",
    previewTitle: "Analytics preview",
    previewDescription:
      "A simple view of pipeline activity and follow-up.",
  },
  {
    id: "collaboration",
    title: "Keep your team on the same page.",
    description:
      "Share notes, activity, and customer history so the next person can pick up the job without asking around.",
    previewTitle: "Team preview",
    previewDescription:
      "Shared notes, activity, and customer context in one view.",
  },
] as const;

export const faqItems = [
  {
    question: "What if most inquiries still come from Facebook, email, or phone?",
    answer:
      "You can still use Requo. Add inquiries manually or send customers to your public form when you need a cleaner intake.",
  },
  {
    question: "Can I use Requo if every job is priced differently?",
    answer:
      "Yes. Requo is built for custom work. You can quote with your own line items, pricing, notes, and scope for each job.",
  },
  {
    question: "What happens after I send a quote?",
    answer:
      "You can keep the quote, customer response, and follow-up in the same workflow so the next step does not get lost.",
  },
  {
    question: "Can my team work from the same job details?",
    answer:
      "Yes. Notes, activity, quote details, and customer history stay in one place so the next person can pick up the job with context.",
  },
  {
    question: "Do I need to rebuild my whole process before using it?",
    answer:
      "No. Start with your next inquiry, send your next quote, and adjust the setup as you go.",
  },
] as const;
