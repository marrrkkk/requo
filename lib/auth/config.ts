import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

import { bootstrapWorkspaceForUser } from "@/lib/auth/workspace-bootstrap";
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { env } from "@/lib/env";
import { sendPasswordResetEmail } from "@/lib/resend/client";

function toOrigin(value: string) {
  return new URL(value).origin;
}

function getTrustedVercelOrigin(value: string) {
  return toOrigin(value.startsWith("http") ? value : `https://${value}`);
}

function buildTrustedOrigins() {
  const origins = new Set<string>([toOrigin(env.BETTER_AUTH_URL)]);

  if (env.NEXT_PUBLIC_BETTER_AUTH_URL) {
    origins.add(toOrigin(env.NEXT_PUBLIC_BETTER_AUTH_URL));
  }

  if (env.VERCEL_URL) {
    origins.add(getTrustedVercelOrigin(env.VERCEL_URL));
  }

  if (env.NODE_ENV !== "production") {
    for (const origin of Array.from(origins)) {
      const url = new URL(origin);

      if (url.hostname === "localhost") {
        url.hostname = "127.0.0.1";
        origins.add(url.origin);
      }

      if (url.hostname === "127.0.0.1") {
        url.hostname = "localhost";
        origins.add(url.origin);
      }
    }
  }

  return Array.from(origins);
}

export const auth = betterAuth({
  appName: "Relay",
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: buildTrustedOrigins(),
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    camelCase: true,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    sendResetPassword: async ({ user, url, token }) => {
      await sendPasswordResetEmail({
        userId: user.id,
        email: user.email,
        name: user.name,
        url,
        token,
      });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
    },
  },
  plugins: [nextCookies()],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await bootstrapWorkspaceForUser({
            id: user.id,
            name: user.name,
            email: user.email,
          });
        },
      },
    },
  },
});
