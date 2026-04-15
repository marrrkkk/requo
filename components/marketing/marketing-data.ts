import type { LucideIcon } from "lucide-react";
import {
  FileText,
  Globe2,
  Inbox,
  Sparkles,
  Upload,
} from "lucide-react";

export const navItems = [
  { href: "#why-requo", label: "Why Requo" },
  { href: "#product", label: "Product" },
  { href: "#how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
] as const;

export const whyCards: readonly {
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    icon: Upload,
    title: "Collect better requests up front",
    description:
      "Public inquiry pages help customers send the scope, timing, files, and budget notes before the owner starts chasing basics.",
  },
  {
    icon: Inbox,
    title: "Keep the job context together",
    description:
      "Qualification notes, inquiry details, quote progress, and customer response stay attached to the same request.",
  },
  {
    icon: FileText,
    title: "See what needs action next",
    description:
      "Know which requests need review, which quotes are ready, and which customers still need a follow-up.",
  },
] as const;

export const productCards: readonly {
  icon: LucideIcon;
  title: string;
  description: string;
  points: readonly string[];
}[] = [
  {
    icon: Globe2,
    title: "Inquiry capture",
    description:
      "Give customers a clean page to send the request before the owner replies.",
    points: [
      "Scope and files",
      "Timing and budget",
      "Business-branded intake",
    ],
  },
  {
    icon: Inbox,
    title: "Owner queue",
    description:
      "Review what needs qualification, a quote, or a follow-up without living in email.",
    points: [
      "Lead context",
      "Status visibility",
      "Next action",
    ],
  },
  {
    icon: FileText,
    title: "Quote workflow",
    description:
      "Prepare and send a clear quote while keeping the original inquiry attached.",
    points: [
      "Linked inquiry details",
      "Customer quote page",
      "Reminder visibility",
    ],
  },
] as const;

export const workflowSteps = [
  {
    title: "Capture the inquiry",
    description:
      "Collect incoming requests from your inquiry page, referrals, ads, or direct outreach in one place.",
  },
  {
    title: "Qualify the lead",
    description:
      "Review fit, gather missing details, and confirm scope before you spend time pricing the work.",
  },
  {
    title: "Send the quote",
    description:
      "Prepare a professional quote with the request details, files, and notes still tied to the same job.",
  },
  {
    title: "Follow up",
    description:
      "Keep customer response, quote status, and the next follow-up visible instead of relying on memory.",
  },
] as const;

export const faqItems = [
  {
    question: "Does Requo replace my inbox?",
    answer:
      "It replaces the scattered workflow around your inbox. The inquiry, quote, and next action stay organized in Requo instead of being rebuilt across tools.",
  },
  {
    question: "Can customers submit files with their inquiry?",
    answer:
      "Yes. Public inquiry pages can collect attachments alongside the request details so the owner has more context before pricing.",
  },
  {
    question: "Can I send a quote and track the response?",
    answer:
      "Yes. Quotes stay linked to the original inquiry, and follow-up remains visible after the quote is sent.",
  },
] as const;

export const aiAssistNote = {
  icon: Sparkles,
  title: "AI draft help stays secondary",
  description:
    "Use your notes, FAQs, and uploaded files to start a practical reply faster, then edit before you send.",
} as const;
