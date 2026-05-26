# Database Migrations

## Overview

Requo uses [Drizzle ORM](https://orm.drizzle.team/) with sequential SQL migrations. A single migration history lives in `drizzle/` and is shared across all environments. Only environment variables differ between dev and production.

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐
│  Schema files   │     │  drizzle/ folder     │
│  lib/db/schema/ │────▶│  0000_init.sql       │
│                 │     │  0001_*.sql          │
│  (source of     │     │  meta/_journal.json  │
│   truth)        │     │  meta/0000_snap.json │
└─────────────────┘     └──────────────────────┘
                               │
         ┌─────────────────────┼──────────────────────┐
         ▼                     ▼                      ▼
   ┌───────────┐        ┌───────────┐         ┌───────────┐
   │  Dev DB   │        │  Test DB  │         │  Prod DB  │
   │ localhost │        │ localhost │         │ Supabase  │
   └───────────┘        └───────────┘         └───────────┘
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Runtime connection (pooler for Supabase, direct for local) |
| `DATABASE_MIGRATION_URL` | Migration connection (always direct, not pooler) |

For Supabase, the pooler is port 6543 and direct is port 5432. Migrations must use direct connections because DDL statements don't work through connection poolers.

## Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `npm run db:generate` | Generate migration SQL from schema diff | After editing schema files (dev only) |
| `npm run db:migrate` | Apply pending migrations | Dev, CI, and production deploys |
| `npm run db:push` | Push schema directly (no migration) | Quick local prototyping only |
| `npm run db:reset` | Drop all tables + re-migrate | Reset dev DB to clean state |
| `npm run db:studio` | Open Drizzle Studio GUI | Browsing data locally |

## Workflow

### Development (schema changes)

```bash
# 1. Edit schema files in lib/db/schema/
# 2. Generate a new migration
npm run db:generate -- --name descriptive_name

# 3. Apply it locally
npm run db:migrate

# 4. Commit the migration + schema change together
git add drizzle/ lib/db/schema/
git commit -m "feat: add X table"
```

### Production (deployment)

Production **only applies** existing migrations. It never generates new ones.

The `vercel-build` script handles this automatically:
```
npm run db:migrate && next build
```

### Fresh local setup

```bash
# Apply all migrations to a new local database
npm run db:migrate

# Or reset an existing local database
npm run db:reset
```

## Rules

1. **Never run `db:generate` or `db:push` against production.**
2. **Never edit committed migration files** — always create a new migration.
3. **Always use `DATABASE_MIGRATION_URL`** (direct connection) for migrations.
4. **Commit migrations with the schema change** so the pair stays in sync.
5. **One migration per logical change** — don't squash unrelated changes.

## Troubleshooting

### "Migration already applied" errors after reset

If production already has the schema but a new migration history:
```bash
DATABASE_MIGRATION_URL=<prod-direct-url> npx tsx scripts/mark-migrations-applied.ts
```

This tells Drizzle the migration was already applied without re-running the SQL.

### Schema drift between environments

If dev and prod have drifted, the only safe resolution is:
1. Make dev match prod's actual state
2. Generate a migration from dev
3. Apply it to prod

Never force-push to production or skip migrations.

### Local DB is corrupted

```bash
npm run db:reset
```

This drops everything and re-applies all migrations from scratch.
