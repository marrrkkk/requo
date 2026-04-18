"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth/client";

type AuthenticatedPageRedirectProps = {
  redirectTo: string;
};

export function AuthenticatedPageRedirect({
  redirectTo,
}: AuthenticatedPageRedirectProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  useEffect(() => {
    if (session?.user) {
      router.replace(redirectTo);
    }
  }, [redirectTo, router, session?.user]);

  return null;
}
