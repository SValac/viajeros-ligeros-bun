---
name: db-migration
description: Create, verify and ship a Supabase migration in this repo without losing production data. Use whenever a change needs a new file in supabase/migrations/ (new/changed table, column, trigger, RLS policy, RPC), when regenerating database.types.ts, or when pushing migrations to stage/QA or production.
---

# Database migration (production has real data)

Production holds real agency data since 2026-10-02. Every migration must keep existing rows and files. Full rules: `docs/claude/05-git-workflow.md` → "Database Migrations" and "Production data safety".

| Environment | Project ref | Push command |
| --- | --- | --- |
| Local (Docker) | — | `bun run db:reset` |
| Stage + QA (shared) | `wfmpttxmztlniiqvkrcl` | `bun run db:push:stage` |
| Production | `mkosbzhagjbyfvizafta` | `bun run db:push:prod` (user runs it) |

## 1. Design the change (before writing SQL)

- Load the `supabase:supabase-postgres-best-practices` skill for schema, index, RLS and trigger rules.
- **Expand → backfill → contract.** Add the new column/table, copy the data, ship code that uses it. Drop the old one only in a **later PR**, once confirmed unused.
- **Backward compatible.** Migrations reach the database before the PR merges, so the currently deployed CRM **and** the public web site (`viajeros-ligeros-web`) must keep working against the new schema. If an RPC the web uses changes (`get_public_agency_profile`, `get_travel_public_prices`, …), only append fields; coordinate with the web session before removing or renaming.
- Not allowed in one step: plain `DROP COLUMN` / `DROP TABLE`, narrowing types, `NOT NULL` without default or backfill, renames the deployed app still reads.

## 2. Create the file

```bash
supabase migration new <snake_case_name> < /dev/null
```

`< /dev/null` is required: without a TTY the CLI waits on stdin forever and leaves an empty file. Then write the SQL into the new file with the Write tool.

Every drop must be guarded so it refuses to run while data exists (pattern from `supabase/migrations/20260924183111_agency_about_page.sql`):

```sql
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.<table> WHERE <column> IS NOT NULL) THEN
    RAISE EXCEPTION '<table>.<column> has data; migrate it before dropping it';
  END IF;
END;
$$;
```

## 3. Verify locally

```bash
bun run db:reset   # applies all migrations + supabase/seed.sql
bun run db:types
bunx prettier --no-semi --parser typescript --write app/types/database.types.ts
```

- The prettier step is required: the CLI emits unformatted types and the diff would be thousands of lines. After it, the diff should show only the real schema change.
- If `db:reset` fails with storage `42P10` after a `supabase link`, run `bun run db:stop && bun run db:start` (not a docker restart).
- Do not run `bun run typecheck` while `bun run dev` is running (it breaks the dev server); typecheck a copy in the scratchpad instead.
- Test the feature in the app with the seed login `dev@viajeros-ligeros.local` / `password123`.

## 4. Destructive change? Check production first

If the migration drops, narrows or rewrites existing data:

1. Count affected rows in production, **read-only** (`select count(*) …` via `supabase db query --linked` while linked to prod), and report the number to the user.
2. Suggest a backup before pushing: `supabase db dump --linked --data-only -f prod-backup.sql` (keep it out of git). If the direct connection fails (IPv6), use `supabase db query --linked -o json "select json_agg(t) from public.<table> t"` per table.

## 5. Push to Stage/QA, then Production

1. Check which project is linked before any push: `cat supabase/.temp/project-ref`. After a prod push the CLI stays linked to prod.
2. Stage/QA: try `bun run db:push:stage` once (never with `--yes`). If auto mode denies it, give the user `! bun run db:push:stage`.
3. Verify on the stage/QA deployed apps.
4. Production: **never run it yourself.** Give the user `! bun run db:push:prod`, then verify read-only (query the new column/function as `anon` or with a read-only `select`).

## Never

- `supabase db reset --linked` against production (it wipes the database). Only for rebuilding Stage/QA, and only with the user's OK.
- Bulk deletes of rows or `storage.objects` in production.
- Hand-editing a migration that already reached stage or prod; write a new one.

## 6. Commit and PR

- Commit the migration on its own (`feat(db): …` / `fix(db): …`), separate from the UI and store changes, plus `database.types.ts` with it. No Claude attribution in commits or PR body.
- The PR description needs a **«Riesgo de datos»** section: what existing data is affected, how it is preserved, how to roll back.
- In the PR body, say which environments already have the migration (local / stage / prod).
