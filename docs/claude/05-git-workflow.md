# Git Workflow

- **Husky** — pre-commit hook runs lint-staged automatically
- **lint-staged** — runs `bun run lint` on all staged files before every commit

## Environments & Deploy Flow

Vercel project is on the Hobby (free) plan, which has no Custom Environments. Stage and QA are implemented as persistent branches with their own Preview domain instead:

- **Stage**: `viajeros-ligeros-bun-git-stage-svalacs-projects.vercel.app`
- **QA**: `viajeros-ligeros-bun-git-qa-svalacs-projects.vercel.app`

Stage and QA share a dedicated Supabase project, isolated from Production (see [Database Migrations](#database-migrations) below).

1. **Feature work** — branch off `main` as `feature/xxx`, open a PR. Every PR gets its own throwaway Preview URL (the `#NN` links in Vercel's Active Branches list) for reviewing that change in isolation.
2. **QA** — when something needs a stable, shareable link (manual testing, client review) instead of a per-PR URL, merge it into `qa`:
   ```bash
   git checkout qa
   git merge feature/xxx
   git push origin qa
   ```
3. **Stage** — final rehearsal right before shipping. Merge what's about to land in `main` into `stage` first and verify on its persistent URL:
   ```bash
   git checkout stage
   git merge main
   git push origin stage
   ```
4. **Production** — merge the PR into `main` with a **merge commit** (see [Merging PRs](#merging-prs)); Vercel deploys it automatically.
5. **Keep in sync** — after every PR is merged into `main`, merge `main` back into `stage` and `qa`:
   ```bash
   git checkout stage && git merge main && git push
   git checkout qa && git merge main && git push
   ```
   Because PRs keep their original commits, `qa`/`stage` already share them with `main`, so this merge is clean. It just brings in the merge commit and anything that never went through `qa`.

## Merging PRs

PRs are merged with a **merge commit**. Squash and rebase merges are turned off in the GitHub repo settings.

Why:

- The feature's commits land in `main` unchanged (same SHAs). A feature merged into `qa`/`stage` earlier is then recognized as already merged, so the persistent branches never conflict over the same change. Squash merges created a new commit on `main` and caused those conflicts.
- Commits stay split by concern (`feat(...)`, `refactor(...)`, `docs: ...`), so `git log` and `git blame` point at the specific change rather than a whole PR.
- Local `main` fast-forwards on `git pull` instead of diverging.

Rules that follow from it:

- **Branch history is what ships.** Clean up `wip`/`fix lint` commits before merging (`git rebase -i` locally, or `git commit --fixup` + `git rebase --autosquash`).
- **PR title becomes the merge commit title**, so write it in Conventional Commits form (`feat(quotations): add quotations menu`), not the branch name.
- **One-PR view of history**: `git log --first-parent --oneline main`.
- **Reverting a whole PR**: `git revert -m 1 <merge-sha>`.

> **Gotcha**: pushing a brand-new branch whose HEAD is identical to an already-deployed commit (e.g. right after `git checkout -b <branch> main`) does not trigger a Vercel build. Follow it with a real (or empty) commit and push again to get the first deploy.

## Database Migrations

Migration files in `supabase/migrations/` are a single, shared history versioned in git — there are **not** separate migration files per environment. What differs is *when* each database receives them: unlike Vercel (one push deploys code everywhere), Supabase requires an explicit push per project.

Two Supabase projects exist:

| Environment | Project ref |
| --- | --- |
| Stage + QA (shared) | `wfmpttxmztlniiqvkrcl` |
| Production | `mkosbzhagjbyfvizafta` |

Helper scripts in `package.json` switch the CLI's linked project and push — no database password needed, `supabase link` authenticates via the CLI session (`supabase login`):

```bash
bun run db:link:prod     # link to Production only
bun run db:link:stage    # link to Stage/QA only
bun run db:push:prod     # link + db push to Production
bun run db:push:stage    # link + db push to Stage/QA
```

Flow for a new migration:

1. `supabase migration new <name>` — creates the timestamped SQL file.
2. `bun run db:reset` — apply it locally (Docker Postgres) and verify.
3. `bun run db:push:stage` — push to Stage/QA, verify against those deployed apps.
4. `bun run db:push:prod` — push to Production once verified. Claude's auto mode blocks this command, so the user runs it (`! bun run db:push:prod` from the Claude Code prompt); Claude then verifies read-only as `anon`. Afterwards the CLI stays linked to Production.
5. Commit the migration file with the rest of the change and go through the normal PR flow into `main`.

> **Note**: after switching the linked project, `supabase projects list` shows which one is currently `linked: true`. Check it before any `db push` if picking up work in a new session, to avoid pushing to the wrong database.

### Production data safety

**Since 2026-10-02 Production holds real agency data. No change may lose it.** Every migration, script and delete flow must preserve existing rows and files.

Migrations:

- **No destructive one-step changes.** Don't use plain `DROP COLUMN` / `DROP TABLE`, type changes that can truncate or reject values, `NOT NULL` without a default or backfill, or renames the deployed app still reads.
- **Expand → backfill → contract.** Add the new column or table, copy the data, ship the code that uses it, and drop the old one only in a later PR, once it is confirmed unused.
- **Stay backward compatible.** Migrations reach the database before the merge (step 4 above), so the currently deployed CRM and public web site must keep working against the new schema.
- **Guard every drop.** Use a `DO` block that raises if the column or table still has data. Pattern: `supabase/migrations/20260924183111_agency_about_page.sql`.
- **Check first.** Before a destructive change, count the affected rows in Production read-only, report the count, and take a backup (`supabase db dump --linked --data-only -f prod-backup.sql`, kept out of git) before `db:push:prod`.

Commands that must **never** run against Production:

- `supabase db reset --linked`: it wipes the database. Use it only to rebuild Stage/QA.
- Bulk deletes of rows or `storage.objects` (logos, banners, travel images).

App code:

- Deletes that cascade (travels, providers, quotations, travelers) must ask for confirmation and say what else is removed.
- Deleting a row must not orphan or silently wipe related rows or storage files.

PRs: when a change touches the schema or deletes data, add a **«Riesgo de datos»** section to the description. It says what existing data is affected, how it is preserved, and how to roll back.

---

[← Code Style](./04-code-style.md) | [Volver al índice](../../CLAUDE.md) | [Siguiente: TypeScript →](./06-typescript.md)
