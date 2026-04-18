import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  BookOpen,
  CreditCard,
  Download,
  FileText,
  FormInput,
  Inbox,
  Plug,
  Tags,
  Upload,
  Users,
} from "lucide-react";

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

/** Landing page Features accordion — aligned with dashboard capabilities. */
export const landingFeatureItems: readonly {
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    icon: Inbox,
    title: "Incoming requests",
    description:
      "Capture new leads in one queue, review scope and timing, and move work forward without losing context between messages and tools.",
  },
  {
    icon: FileText,
    title: "Quotes",
    description:
      "Draft and send quotes with the inquiry still in view, share a clear customer-facing quote link, and track responses after it goes out.",
  },
  {
    icon: FormInput,
    title: "Inquiry forms & public intake",
    description:
      "Choose how customers reach you with customizable inquiry forms and public pages so the right details arrive before you price the job.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description:
      "See how inquiries and quotes trend over time so you can spot bottlenecks and focus where the pipeline needs attention.",
  },
  {
    icon: Users,
    title: "Workspace & members",
    description:
      "Organize businesses under workspaces, invite teammates, and align roles so permissions match who runs intake versus who administers the account.",
  },
  {
    icon: BookOpen,
    title: "Knowledge & saved replies",
    description:
      "Keep consistent answers ready and reuse vetted wording when you respond so follow-up stays fast without sounding generic.",
  },
  {
    icon: Tags,
    title: "Quote defaults & pricing library",
    description:
      "Configure quote defaults and line-item libraries so pricing stays consistent while you still adapt each job.",
  },
  {
    icon: Bell,
    title: "Notifications",
    description:
      "Stay aware of new requests, quote activity, and what needs a reply with notification settings you can tune to your role.",
  },
  {
    icon: CreditCard,
    title: "Billing & plans",
    description:
      "Manage workspace subscription and plan choices in one place so upgrade paths stay clear as you grow.",
  },
  {
    icon: Plug,
    title: "Integrations",
    description:
      "Connect tools you already rely on so Requo fits the workflow instead of forcing another silo.",
  },
  {
    icon: Upload,
    title: "Files & context",
    description:
      "Keep attachments and internal notes tied to the same lead so nothing important lives only in a side thread.",
  },
  {
    icon: Download,
    title: "Exports",
    description:
      "Download inquiry and quote data when you need to analyze or archive outside Requo.",
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
