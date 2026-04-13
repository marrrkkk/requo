import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { auth } from "@/lib/auth/server";

export const getSession = cache(async () => {
  await connection();

  return auth.api.getSession({
    headers: await headers(),
  });
});

export async function getCurrentUser() {
  return (await getSession())?.user ?? null;
}

export async function redirectIfAuthenticated(redirectTo = "/workspaces") {
  const session = await getSession();

  if (session) {
    redirect(redirectTo);
  }

  return session;
}

export async function requireSession(redirectTo = "/login") {
  const session = await getSession();

  if (!session) {
    redirect(redirectTo);
  }

  return session;
}

export async function requireUser(redirectTo = "/login") {
  return (await requireSession(redirectTo)).user;
}

export type AuthSession = NonNullable<Awaited<ReturnType<typeof getSession>>>;
export type AuthUser = AuthSession["user"];
