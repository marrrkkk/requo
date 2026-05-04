import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

config({ path: ".env.local" });
config();

function getDatabaseUrl() {
  const databaseUrl =
    process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_MIGRATION_URL or DATABASE_URL must be set before running migrations.",
    );
  }

  return databaseUrl;
}

function shouldRequireSsl(databaseUrl: string) {
  try {
    const { hostname, searchParams } = new URL(databaseUrl);
    const sslMode = searchParams.get("sslmode");

    if (sslMode === "disable") {
      return false;
    }

    return !["localhost", "127.0.0.1", "::1"].includes(hostname);
  } catch {
    return true;
  }
}

type MigrationJournalEntry = {
  idx: number;
  when: number;
  tag: string;
  breakpoints: boolean;
};

type MigrationMetadata = {
  tag: string;
  when: number;
  hash: string;
};

type SqlClient = ReturnType<typeof postgres>;

async function tableExists(client: SqlClient, tableName: string) {
  const [row] = await client<{ exists: boolean }[]>`
    select exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = ${tableName}
    ) as exists
  `;

  return row?.exists ?? false;
}

async function columnExists(
  client: SqlClient,
  tableName: string,
  columnName: string,
) {
  const [row] = await client<{ exists: boolean }[]>`
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = ${tableName}
        and column_name = ${columnName}
    ) as exists
  `;

  return row?.exists ?? false;
}

async function indexExists(client: SqlClient, indexName: string) {
  const [row] = await client<{ exists: boolean }[]>`
    select exists (
      select 1
      from pg_indexes
      where schemaname = 'public'
        and indexname = ${indexName}
    ) as exists
  `;

  return row?.exists ?? false;
}

async function enumValueExists(
  client: SqlClient,
  typeName: string,
  label: string,
) {
  const [row] = await client<{ exists: boolean }[]>`
    select exists (
      select 1
      from pg_type t
      join pg_enum e on e.enumtypid = t.oid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public'
        and t.typname = ${typeName}
        and e.enumlabel = ${label}
    ) as exists
  `;

  return row?.exists ?? false;
}

function readMigrationMetadata() {
  const journalPath = join(process.cwd(), "drizzle", "meta", "_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
    entries: MigrationJournalEntry[];
  };

  return new Map<string, MigrationMetadata>(
    journal.entries.map((entry) => {
      const migrationPath = join(process.cwd(), "drizzle", `${entry.tag}.sql`);
      const query = readFileSync(migrationPath, "utf8");

      return [
        entry.tag,
        {
          tag: entry.tag,
          when: entry.when,
          hash: createHash("sha256").update(query).digest("hex"),
        },
      ];
    }),
  );
}

async function hasPublicMaximusSchema(client: SqlClient) {
  return (
    (await tableExists(client, "businesses")) &&
    (await tableExists(client, "business_members")) &&
    (await tableExists(client, "business_member_invites")) &&
    (await tableExists(client, "business_inquiry_forms")) &&
    (await tableExists(client, "business_memories")) &&
    (await tableExists(client, "business_notifications")) &&
    (await tableExists(client, "business_notification_states")) &&
    (await columnExists(client, "workspaces", "plan")) &&
    (await columnExists(client, "workspaces", "owner_user_id")) &&
    !(await columnExists(client, "workspaces", "business_type")) &&
    (await columnExists(client, "quotes", "business_id")) &&
    !(await columnExists(client, "quotes", "workspace_id")) &&
    (await columnExists(client, "inquiries", "business_inquiry_form_id")) &&
    !(await columnExists(client, "inquiries", "workspace_inquiry_form_id"))
  );
}

async function hasInviteNotificationColumns(client: SqlClient) {
  return (
    (await columnExists(client, "businesses", "notify_on_member_invite_response")) &&
    (await columnExists(
      client,
      "businesses",
      "notify_in_app_on_member_invite_response",
    ))
  );
}

async function hasInviteNotificationEnums(client: SqlClient) {
  return (
    (await enumValueExists(client, "inquiry_status", "overdue")) &&
    (await enumValueExists(
      client,
      "business_notification_type",
      "business_member_invite_accepted",
    )) &&
    (await enumValueExists(
      client,
      "business_notification_type",
      "business_member_invite_declined",
    ))
  );
}

async function hasDashboardPerformanceIndexes(client: SqlClient) {
  return (
    (await indexExists(client, "quotes_sent_valid_until_idx")) &&
    (await indexExists(client, "quotes_sent_follow_up_idx")) &&
    (await indexExists(client, "inquiries_open_deadline_idx"))
  );
}

async function hasBillingSchema(client: SqlClient) {
  const hasLegacyLemonSqueezyProvider = await enumValueExists(
    client,
    "billing_provider",
    "lemonsqueezy",
  );
  const hasPaddleProvider = await enumValueExists(
    client,
    "billing_provider",
    "paddle",
  );

  return (
    (await tableExists(client, "billing_events")) &&
    (await tableExists(client, "payment_attempts")) &&
    (await tableExists(client, "workspace_subscriptions")) &&
    (await enumValueExists(client, "billing_currency", "USD")) &&
    (await enumValueExists(client, "billing_currency", "PHP")) &&
    (await enumValueExists(client, "billing_provider", "paymongo")) &&
    (hasLegacyLemonSqueezyProvider || hasPaddleProvider) &&
    (await enumValueExists(client, "payment_attempt_status", "pending")) &&
    (await enumValueExists(client, "subscription_status", "active")) &&
    (await indexExists(client, "workspace_subscriptions_workspace_id_unique")) &&
    (await hasDashboardPerformanceIndexes(client))
  );
}

async function hasSecurityHardeningSchema(client: SqlClient) {
  return (
    (await tableExists(client, "rate_limit")) &&
    (await columnExists(client, "quotes", "public_token_hash"))
  );
}

async function hasRateLimitAdapterCompat(client: SqlClient) {
  return await columnExists(client, "rate_limit", "id");
}

async function hasWorkflowAnalyticsEvents(client: SqlClient) {
  return await tableExists(client, "analytics_events");
}

async function hasRequestQuoteRecordState(client: SqlClient) {
  return await columnExists(client, "inquiries", "archived_at");
}

async function hasSafeWorkspaceBusinessDeletion(client: SqlClient) {
  return await columnExists(client, "businesses", "archived_at");
}

async function hasWorkspaceAuditLog(client: SqlClient) {
  return await tableExists(client, "audit_logs");
}

async function repairKnownMigrationDrift(client: SqlClient) {
  await client`create schema if not exists drizzle`;
  await client`
    create table if not exists drizzle.__drizzle_migrations (
      id serial primary key,
      hash text not null,
      created_at bigint
    )
  `;

  const migrationMetadata = readMigrationMetadata();
  const appliedRows = await client<{ created_at: number }[]>`
    select created_at
    from drizzle.__drizzle_migrations
  `;
  const appliedMigrations = new Set(
    appliedRows.map((row) => Number(row.created_at)),
  );

  const repairCandidates: Array<{
    tag: string;
    matches: (sql: SqlClient) => Promise<boolean>;
  }> = [
    {
      tag: "0024_public_maximus",
      matches: hasPublicMaximusSchema,
    },
    {
      tag: "0025_slippery_diamondback",
      matches: hasInviteNotificationColumns,
    },
    {
      tag: "0026_dazzling_proudstar",
      matches: hasInviteNotificationEnums,
    },
    {
      tag: "0027_dashboard_performance_indexes",
      matches: hasDashboardPerformanceIndexes,
    },
    {
      tag: "0028_huge_flatman",
      matches: hasBillingSchema,
    },
    {
      tag: "0030_security_hardening",
      matches: hasSecurityHardeningSchema,
    },
    {
      tag: "0032_auth_rate_limit_adapter_compat",
      matches: hasRateLimitAdapterCompat,
    },
    {
      tag: "0033_workflow_analytics_events",
      matches: hasWorkflowAnalyticsEvents,
    },
    {
      tag: "0034_request_quote_record_state",
      matches: hasRequestQuoteRecordState,
    },
    {
      tag: "0035_safe_workspace_business_deletion",
      matches: hasSafeWorkspaceBusinessDeletion,
    },
    {
      tag: "0036_workspace_audit_log",
      matches: hasWorkspaceAuditLog,
    },
  ];

  const repairedTags: string[] = [];

  for (const candidate of repairCandidates) {
    const metadata = migrationMetadata.get(candidate.tag);

    if (!metadata || appliedMigrations.has(metadata.when)) {
      continue;
    }

    if (!(await candidate.matches(client))) {
      continue;
    }

    await client`
      insert into drizzle.__drizzle_migrations ("hash", "created_at")
      values (${metadata.hash}, ${metadata.when})
    `;

    appliedMigrations.add(metadata.when);
    repairedTags.push(candidate.tag);
  }

  if (repairedTags.length > 0) {
    console.log(
      `Repaired historical Drizzle migration drift: ${repairedTags.join(", ")}`,
    );
  }
}

async function main() {
  const databaseUrl = getDatabaseUrl();
  const client = postgres(databaseUrl, {
    ssl: shouldRequireSsl(databaseUrl) ? "require" : false,
    max: 1,
  });

  try {
    await repairKnownMigrationDrift(client);
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log("Migrations applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Migration failed.");
  console.error(error);
  process.exitCode = 1;
});
