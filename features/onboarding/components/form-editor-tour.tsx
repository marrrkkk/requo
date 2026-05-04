"use client";

import { completeFormEditorTourAction } from "@/features/onboarding/tour-actions";
import { GuidedTour, type TourStep } from "@/features/onboarding/components/guided-tour";

const tourSteps: TourStep[] = [
  {
    selector: '[data-tour="form-builder"]',
    title: "Customize your fields",
    description:
      "Change what information you collect from potential customers.",
    side: "bottom",
  },
  {
    selector: '[data-tour="public-page"]',
    title: "Design the page",
    description:
      "Adjust the text, colors, and layout of the page your customers will see.",
    side: "bottom",
  },
  {
    selector: '[data-tour="form-settings"]',
    title: "Publishing & Controls",
    description:
      "Set your form live or configure where new inquiries are sent.",
    side: "bottom",
  },
];

export function FormEditorTour({ show }: { show: boolean }) {
  return (
    <GuidedTour
      onComplete={completeFormEditorTourAction}
      show={show}
      steps={tourSteps}
    />
  );
}
