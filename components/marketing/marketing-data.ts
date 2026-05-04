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
    question: "What if most of my inquiries come from Facebook, Instagram, WhatsApp, email, or phone?",
    answer:
      "That is exactly why Requo exists. You can add inquiries from any channel, keep customer details in one place, create a quote, then share the quote link back through the same channel.",
  },
  {
    question: "Can I use Requo if every job is priced differently?",
    answer:
      "Yes. Requo is built for custom service work. You can create quotes with custom line items, notes, totals, expiry dates, and customer-specific details.",
  },
  {
    question: "Do I need to send quotes by email?",
    answer:
      "No. Requo gives you a quote link you can send through email, WhatsApp, Messenger, Instagram, SMS, or any channel you already use.",
  },
  {
    question: "What happens after I send a quote?",
    answer:
      "You can track whether the quote was viewed, accepted, rejected, or still needs a follow-up. Requo helps keep the next step visible so quotes do not get forgotten.",
  },
  {
    question: "What happens after a customer accepts a quote?",
    answer:
      "The inquiry can be marked as won, and you can move into post-win next steps like contacting the customer, scheduling the work, requesting a deposit, or marking the work completed.",
  },
  {
    question: "Can my team work from the same inquiry and quote details?",
    answer:
      "Yes, depending on your plan. Teams can work from the same workspace or business so everyone sees the same inquiries, quotes, statuses, and follow-ups.",
  },
  {
    question: "Do I need to rebuild my whole process before using Requo?",
    answer:
      "No. Requo is meant to fit around how you already get customers. Start by capturing inquiries, creating quotes, sharing quote links, and tracking follow-ups.",
  },
  {
    question: "Is Requo a full CRM or project management tool?",
    answer:
      "No. Requo is focused on the inquiry-to-quote workflow: capturing requests, creating quotes, sharing links, tracking responses, and managing follow-ups. It stays lighter than a full CRM.",
  },
  {
    question: "Is Requo free to start?",
    answer:
      "Yes. You can start free, test the workflow, and upgrade when you need higher limits, more features, or team access.",
  },
] as const;
