"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function AutoPrintOnLoad() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("autoprint") === "0") {
      return;
    }

    const timer = window.setTimeout(() => {
      window.print();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchParams]);

  return null;
}
