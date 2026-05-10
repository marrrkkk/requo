import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";

import { ensureProfileForUser } from "@/lib/auth/business-bootstrap";
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { env } from "@/lib/env";
import {
  sendMagicLinkEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "@/lib/resend/client";

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

const shouldSkipTransactionalAuthEmails =
  process.env.DISABLE_TRANSACTIONAL_EMAILS === "1";

export const auth = betterAuth({
  appName: "Requo",
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
    autoSignIn: false,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url, token }) => {
      if (shouldSkipTransactionalAuthEmails) {
        return;
      }

      await sendPasswordResetEmail({
        userId: user.id,
        email: user.email,
        name: user.name,
        url,
        token,
      });
    },
  },
  emailVerification: {
    autoSignInAfterVerification: false,
    sendOnSignIn: true,
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url, token }) => {
      if (shouldSkipTransactionalAuthEmails) {
        return;
      }

      await sendVerificationEmail({
        userId: user.id,
        email: user.email,
        name: user.name,
        token,
        url,
      });
    },
  },
  verification: {
    storeIdentifier: "hashed",
  },
  socialProviders: {
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
  },
  account: {
    accountLinking: {
      trustedProviders: ["google"],
    },
    // OAuth + `verification.storeIdentifier: "hashed"` can break DB+signed-cookie state checks (surfacing as `state_mismatch`).
    storeStateStrategy: "cookie",
  },
  user: {
    deleteUser: {
      enabled: true,
      beforeDelete: async (deletedUser) => {
        const { getAccountDeletionPreflight } = await import(
          "@/features/account/queries"
        );
        const { cleanupDeletedAccountAssets } = await import(
          "@/features/account/mutations"
        );
        const { writeAccountAuditLogsForUser } = await import(
          "@/features/audit/mutations"
        );
        const preflight = await getAccountDeletionPreflight(deletedUser.id);

        if (!preflight.allowed) {
          throw new Error(
            preflight.blockers[0]?.message ??
              "Resolve your owned businesses or business ownership before deleting this account.",
          );
        }

        await writeAccountAuditLogsForUser(deletedUser.id, {
          actorUserId: deletedUser.id,
          actorName: deletedUser.name,
          actorEmail: deletedUser.email,
          action: "account.deleted",
          metadata: {
            accountEmail: deletedUser.email,
          },
          source: "system",
          createdAt: new Date(),
        });

        await cleanupDeletedAccountAssets(deletedUser.id);
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
    },
  },
  advanced: {
    useSecureCookies: env.NODE_ENV === "production",
    // Prefer concrete proxy headers before x-forwarded-for so "::" is not used as a stable client key when a better header exists.
    ipAddress: {
      ipAddressHeaders: ["cf-connecting-ip", "x-real-ip", "x-forwarded-for"],
    },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    customRules: {
      "/get-session": false,
      "/request-password-reset": {
        max: 5,
        window: 300,
      },
      "/reset-password": {
        max: 10,
        window: 300,
      },
      "/sign-in/email": {
        max: 10,
        window: 60,
      },
      "/sign-up/email": {
        max: 5,
        window: 60,
      },
      "/sign-in/magic-link": {
        max: 5,
        window: 60,
      },
      "/magic-link/verify": {
        max: 15,
        window: 60,
      },
    },
  },
  plugins: [
    nextCookies(),
    magicLink({
      expiresIn: 900,
      storeToken: "hashed",
      sendMagicLink: async ({ email, url, token }) => {
        if (shouldSkipTransactionalAuthEmails) {
          return;
        }

        await sendMagicLinkEmail({ email, url, token });
      },
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await ensureProfileForUser({
            id: user.id,
            name: user.name,
            email: user.email,
          });
        },
      },
    },
  },
});
