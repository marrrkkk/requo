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
import type { InquiryPageCardIcon } from "../page-config";

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
