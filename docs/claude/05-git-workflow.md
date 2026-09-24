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
4. **Production** — merge the PR into `main` as usual; Vercel deploys it automatically.
5. **Keep in sync** — right after every PR is merged into `main`, merge `main` back into `stage` and `qa`:
   ```bash
   git checkout stage && git merge main && git push
   git checkout qa && git merge main && git push
   ```
   Why right away: PRs are squash-merged, so `main` gets one new commit while `stage`/`qa` still have the feature's original commits. If the next feature branches from `main` and touches the same files before the sync, merging it into `stage`/`qa` conflicts. If that happens, check that `git diff --name-only origin/main origin/qa -- app supabase` is empty (qa has no code of its own), then resolve with the feature's side (`git checkout --theirs`).

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

---

[← Code Style](./04-code-style.md) | [Volver al índice](../../CLAUDE.md) | [Siguiente: TypeScript →](./06-typescript.md)
