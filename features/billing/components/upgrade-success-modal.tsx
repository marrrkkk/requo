"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BusinessPlan } from "@/lib/plans/plans";

type PlanFeatureHighlight = {
  label: string;
  description: string;
};

const proFeatureHighlights: PlanFeatureHighlight[] = [
  { label: "Unlimited quotes", description: "No monthly cap on quote creation" },
  { label: "Auto follow-ups", description: "Automated email reminders for unresponded quotes" },
  { label: "Visual workflow builder", description: "Drag-and-drop automation canvas" },
  { label: "Multiple inquiry forms", description: "Up to 5 forms for different services" },
  { label: "Knowledge base", description: "Upload files and FAQs for smarter AI drafts" },
  { label: "Advanced branding", description: "Remove Requo branding from public pages" },
  { label: "Data exports", description: "Export inquiries, quotes, and audit logs" },
  { label: "Multiple businesses", description: "Manage up to 5 businesses" },
];

const businessFeatureHighlights: PlanFeatureHighlight[] = [
  { label: "Everything in Pro", description: "All Pro features included" },
  { label: "Team members", description: "Invite up to 25 members with role-based access" },
  { label: "Unlimited forms", description: "No limit on live inquiry forms" },
  { label: "Higher AI limits", description: "500 AI generations per month" },
  { label: "50 quote sends/day", description: "Higher Requo email delivery limits" },
  { label: "10 businesses", description: "Manage up to 10 businesses" },
];

function getFeaturesForPlan(plan: BusinessPlan): PlanFeatureHighlight[] {
  switch (plan) {
    case "pro":
      return proFeatureHighlights;
    case "business":
      return businessFeatureHighlights;
    default:
      return proFeatureHighlights;
  }
}

function getPlanLabel(plan: BusinessPlan): string {
  switch (plan) {
    case "pro":
      return "Pro";
    case "business":
      return "Business";
    default:
      return "Pro";
  }
}

export function UpgradeSuccessModal() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const firedRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<BusinessPlan>("pro");

  useEffect(() => {
    if (firedRef.current) return;
    if (searchParams.get("upgrade") !== "success") return;

    firedRef.current = true;

    const planParam = searchParams.get("plan");
    if (planParam === "pro" || planParam === "business") {
      setPlan(planParam);
    }

    setOpen(true);
  }, [searchParams]);

  function handleClose() {
    setOpen(false);

    const next = new URLSearchParams(searchParams.toString());
    next.delete("upgrade");
    next.delete("plan");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });

    router.refresh();
  }

  const features = getFeaturesForPlan(plan);
  const label = getPlanLabel(plan);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
            <Sparkles className="size-6 text-emerald-600" />
          </div>
          <DialogTitle className="text-center">
            Welcome to {label}
          </DialogTitle>
          <DialogDescription className="text-center">
            Your upgrade is active. Here&apos;s what&apos;s now unlocked:
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <ul className="grid gap-2">
            {features.map((feature) => (
              <li key={feature.label} className="flex items-start gap-3">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">
                    {feature.label}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {feature.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </DialogBody>
        <DialogFooter>
          <Button className="w-full" onClick={handleClose}>
            Get started
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
