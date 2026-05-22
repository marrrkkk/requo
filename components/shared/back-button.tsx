"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function BackButton() {
  const router = useRouter();

  return (
    <Button
      className="max-sm:hidden"
      onClick={() => router.back()}
      size="sm"
      variant="ghost"
    >
      <ArrowLeft data-icon="inline-start" className="size-4" />
      Back
    </Button>
  );
}
