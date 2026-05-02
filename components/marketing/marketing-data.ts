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

export const workflowSteps = [
  {
    title: "Capture",
    description: "Keep details in one place.",
  },
  {
    title: "Review",
    description: "See what is missing fast.",
  },
  {
    title: "Quote",
    description: "Build and send a clear quote.",
  },
  {
    title: "Follow up",
    description: "Keep the next step visible.",
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
