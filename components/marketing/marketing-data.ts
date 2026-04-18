import type { LucideIcon } from "lucide-react";
import { FileText, Globe2, Inbox, Upload } from "lucide-react";

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

export const featureBentoItems: readonly {
  icon: LucideIcon;
  label: string;
  title: string;
  description: string;
  points: readonly string[];
  className: string;
}[] = [
  {
    icon: Globe2,
    label: "Inquiry capture",
    title: "Start with a branded inquiry page that asks for the right details",
    description:
      "Give customers a cleaner place to reach out so new requests arrive with scope, timing, and contact details attached.",
    points: ["Public inquiry pages", "Custom intake forms"],
    className: "lg:col-span-3",
  },
  {
    icon: FileText,
    label: "Quote workflow",
    title: "Build the quote without losing the original request",
    description:
      "Keep the inquiry, notes, and files in view while you draft, price, and send the quote.",
    points: ["Draft from real inquiry context", "Send a clear customer-facing quote"],
    className: "lg:col-span-3",
  },
  {
    icon: Inbox,
    label: "Follow-up",
    title: "See what needs review, what has been quoted, and what needs a nudge",
    description:
      "Stay on top of open leads and quote responses without relying on memory or a scattered inbox.",
    points: ["Visible quote status", "Clear next-step follow-up"],
    className: "lg:col-span-2",
  },
  {
    icon: Upload,
    label: "Files and context",
    title: "Keep files, notes, and job details tied to the same lead",
    description:
      "Attachments and internal context stay with the inquiry and the quote instead of getting buried in side threads.",
    points: ["Files on the inquiry", "Notes carried into the quote"],
    className: "lg:col-span-2",
  },
  {
    icon: FileText,
    label: "Customer response",
    title: "Let customers review and respond from the quote link",
    description:
      "Share a clear public quote page so the customer can review the details and reply without extra back-and-forth.",
    points: ["Public quote pages", "Approve or decline online"],
    className: "lg:col-span-2",
  },
] as const;

export const faqItems = [
  {
    question: "Is Requo a full CRM?",
    answer:
      "No. Requo is focused on the part of the workflow between the first inquiry and the sent quote. It helps service businesses keep requests, quotes, and follow-up in one place without turning into a giant sales system.",
  },
  {
    question: "Can customers send inquiries through Requo?",
    answer:
      "Yes. Requo includes public inquiry pages so customers can send a request with the details you need before you start quoting the work.",
  },
  {
    question: "Can customers view and respond to quotes online?",
    answer:
      "Yes. Quotes can be shared through a customer-facing page so clients can review the details and respond from the link.",
  },
  {
    question: "Will this work for my type of service business?",
    answer:
      "Requo is built for service businesses handling custom work and lead-based quoting. It is not tied to a single trade, so you can adapt the setup to how your business qualifies and quotes jobs.",
  },
  {
    question: "What happens after I sign up?",
    answer:
      "You create your business, choose a starter setup, and can begin collecting inquiries and preparing quotes from there. The defaults are opinionated, but you can edit them later.",
  },
] as const;
