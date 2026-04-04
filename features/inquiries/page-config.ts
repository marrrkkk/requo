import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  ClipboardList,
  FolderUp,
  Mail,
  Package,
  Ruler,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { z } from "zod";

function emptyToUndefined(value: unknown) {
  if (value == null) {
    return undefined;
  }

  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
}

function optionalText(maxLength: number) {
  return z.preprocess(
    emptyToUndefined,
    z.string().trim().max(maxLength).optional(),
  );
}

export const inquiryPageTemplates = [
  "split",
  "stacked",
  "showcase",
] as const;

export type InquiryPageTemplate = (typeof inquiryPageTemplates)[number];

export const inquiryPageTemplateMeta: Record<
  InquiryPageTemplate,
  {
    label: string;
    description: string;
  }
> = {
  split: {
    label: "Split",
    description: "Story and supporting cards on the left, form on the right.",
  },
  stacked: {
    label: "Stacked",
    description: "Centered intro with supporting cards above a full-width form.",
  },
  showcase: {
    label: "Showcase",
    description: "A branded lead surface with supporting details beside the form.",
  },
};

export const inquiryPageCardIconKeys = [
  "details",
  "upload",
  "owner",
  "schedule",
  "measurements",
  "package",
  "sparkles",
  "contact",
] as const;

export type InquiryPageCardIcon = (typeof inquiryPageCardIconKeys)[number];

export const inquiryPageCardIconMeta: Record<
  InquiryPageCardIcon,
  {
    label: string;
    icon: LucideIcon;
  }
> = {
  details: {
    label: "Details",
    icon: ClipboardList,
  },
  upload: {
    label: "Upload",
    icon: FolderUp,
  },
  owner: {
    label: "Owner",
    icon: ShieldCheck,
  },
  schedule: {
    label: "Schedule",
    icon: CalendarDays,
  },
  measurements: {
    label: "Measurements",
    icon: Ruler,
  },
  package: {
    label: "Package",
    icon: Package,
  },
  sparkles: {
    label: "Sparkles",
    icon: Sparkles,
  },
  contact: {
    label: "Contact",
    icon: Mail,
  },
};

export const inquiryPageCardSchema = z.object({
  id: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(240),
  icon: z.enum(inquiryPageCardIconKeys),
});

export type InquiryPageCard = z.infer<typeof inquiryPageCardSchema>;

export const inquiryPageConfigSchema = z.object({
  template: z.enum(inquiryPageTemplates),
  eyebrow: optionalText(48),
  headline: z.string().trim().min(1).max(120),
  description: optionalText(280),
  brandTagline: optionalText(120),
  formTitle: z.string().trim().min(1).max(80),
  formDescription: optionalText(200),
  cards: z.array(inquiryPageCardSchema).max(8),
});

export type InquiryPageConfig = z.infer<typeof inquiryPageConfigSchema>;

type InquiryPageConfigDefaultsInput = {
  workspaceName: string;
  workspaceShortDescription?: string | null;
  legacyInquiryHeadline?: string | null;
  template?: InquiryPageTemplate;
};

function createDefaultInquiryPageCards(): InquiryPageCard[] {
  return [
    {
      id: "details",
      title: "Clear details",
      description:
        "Share the service, timing, and scope in one place so the request is easy to review.",
      icon: "details",
    },
    {
      id: "upload",
      title: "Reference file upload",
      description:
        "Attach a file when artwork, plans, photos, or notes help explain the request.",
      icon: "upload",
    },
    {
      id: "owner",
      title: "Direct review",
      description:
        "Your inquiry goes straight to the business owner without exposing private workspace data.",
      icon: "owner",
    },
  ];
}

export function createInquiryPageConfigDefaults({
  workspaceName,
  workspaceShortDescription,
  legacyInquiryHeadline,
  template = "split",
}: InquiryPageConfigDefaultsInput): InquiryPageConfig {
  const headline =
    template === "showcase"
      ? `Start your request with ${workspaceName}.`
      : `Tell ${workspaceName} what you need.`;
  const description =
    legacyInquiryHeadline?.trim() ||
    (template === "stacked"
      ? `Share the job scope, timing, and any files so ${workspaceName} can review everything clearly.`
      : `Use this page to send a detailed request directly to ${workspaceName}.`);

  return {
    template,
    eyebrow: "Inquiry page",
    headline,
    description,
    brandTagline: workspaceShortDescription?.trim() || undefined,
    formTitle: "Send inquiry",
    formDescription: `Your request goes straight to ${workspaceName}.`,
    cards: createDefaultInquiryPageCards(),
  };
}

export function getNormalizedInquiryPageConfig(
  value: unknown,
  defaults: InquiryPageConfigDefaultsInput,
) {
  const fallback = createInquiryPageConfigDefaults(defaults);
  const parsed = inquiryPageConfigSchema.safeParse(value);

  if (!parsed.success) {
    return fallback;
  }

  return parsed.data;
}
