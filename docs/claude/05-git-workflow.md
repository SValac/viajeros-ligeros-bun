# Git Workflow

- **Husky** — pre-commit hook runs lint-staged automatically
- **lint-staged** — runs `bun run lint` on all staged files before every commit

## Environments & Deploy Flow

Vercel project is on the Hobby (free) plan, which has no Custom Environments. Stage and QA are implemented as persistent branches with their own Preview domain instead:

- **Stage**: `viajeros-ligeros-bun-git-stage-svalacs-projects.vercel.app`
- **QA**: `viajeros-ligeros-bun-git-qa-svalacs-projects.vercel.app`

Both currently point at the same Supabase project as Production (no separate stage/QA database).

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
5. **Keep in sync** — periodically merge `main` back into `stage` and `qa` so they don't drift:
   ```bash
   git checkout stage && git merge main && git push
   git checkout qa && git merge main && git push
   ```

> **Gotcha**: pushing a brand-new branch whose HEAD is identical to an already-deployed commit (e.g. right after `git checkout -b <branch> main`) does not trigger a Vercel build. Follow it with a real (or empty) commit and push again to get the first deploy.

---

[← Code Style](./04-code-style.md) | [Volver al índice](../../CLAUDE.md) | [Siguiente: TypeScript →](./06-typescript.md)
