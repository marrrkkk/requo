# Database Migrations

## Overview

Requo uses [Drizzle ORM](https://orm.drizzle.team/) with sequential SQL migrations in `drizzle/`.

- `lib/db/schema/*` is the schema source of truth.
- `drizzle/*.sql` is the migration history that gets applied in all environments.
- Dev and prod use separate databases, but share the same migration history.

## Environment Strategy (Dev vs Prod)

Use separate direct URLs for migrations and runtime:

| Variable | Used by | Requirement |
|---|---|---|
| `DATABASE_URL` | App runtime queries | Pooler is fine in prod |
| `DATABASE_MIGRATION_URL` | Drizzle migrations (`db:migrate`) | Must be **direct** Postgres URL |

For Supabase:

- Pooler: `6543` (runtime)
- Direct Postgres: `5432` (migrations)

`db:migrate` now rejects pooler URLs on `6543` to prevent broken DDL runs.

## Commands

| Command | Purpose |
|---|---|
| `npm run db:generate -- --name <name>` | Generate SQL migration from schema changes (dev only) |
| `npm run db:migrate` | Apply migrations in normal mode |
| `npm run db:migrate:strict` | Apply migrations and require `DATABASE_MIGRATION_URL` |
| `npm run db:reset` | Drop local DB objects and re-run migrations |
| `npm run db:studio` | Open Drizzle Studio |
| `npx tsx scripts/mark-migrations-applied.ts` | Mark existing migrations as applied without executing SQL |

## Standard Workflow

### 1) Development schema change

```bash
# Edit schema files
# lib/db/schema/*.ts

# Generate migration
npm run db:generate -- --name descriptive_name

# Apply locally
npm run db:migrate

# Commit schema + migration together
git add lib/db/schema drizzle
git commit -m "feat: ..."
```

### 2) Deploy (preview/prod)

Production should never generate new migrations.
It should only apply committed ones.

`vercel-build` runs:

```bash
npm run db:migrate:strict && next build
```

`db:migrate:strict` fails if `DATABASE_MIGRATION_URL` is missing.

## Rebaseline / Migration Reset Playbook

Use this when migration history is messy or duplicate/conflicting migrations are causing drift.

### A) New/empty production database

1. Keep the cleaned migration history in git.
2. Set `DATABASE_MIGRATION_URL` to direct prod URL.
3. Run `npm run db:migrate:strict`.

No marking step is required for empty DBs.

### B) Existing production database with schema already present

If you reset/squash local migration history but prod already has tables:

1. Deploy updated migration files.
2. Run:

```bash
DATABASE_MIGRATION_URL=<prod-direct-url> npx tsx scripts/mark-migrations-applied.ts
```

3. Verify migration table and app startup.

This records migration tags in `drizzle.__drizzle_migrations` without re-running DDL.

## Guardrails

1. Never run `db:generate` or `db:push` against production.
2. Use `DATABASE_MIGRATION_URL` (direct DB URL) for all migrations.
3. Prefer `db:migrate:strict` in CI/deploy.
4. Commit schema and migration changes in the same PR.
5. Avoid editing old migration files unless intentionally doing a rebaseline.

## Troubleshooting

### `invalid input syntax` / DDL errors on deploy

- Check `DATABASE_MIGRATION_URL` points to direct URL, not pooler.
- Ensure deploy env has `DATABASE_MIGRATION_URL` configured.

### Migration says already applied / relation exists

- Existing DB likely has schema but missing migration metadata.
- Use `scripts/mark-migrations-applied.ts` once for that environment.

### Local DB drift or corruption

```bash
npm run db:reset
```

This rebuilds local schema from `drizzle/`.
