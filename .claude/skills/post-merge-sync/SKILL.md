---
name: post-merge-sync
description: Close out a PR after the user merged it into main in this repo — pull main, merge main into qa and stage and push them, check migrations reached every database, check Vercel deploys, mark the GitHub project #3 item Done, and save the PR to engram. Use when the user says a PR was merged ("ya mergeé", "ya se mergeó el PR", "merged #NN"). Optional argument is the PR number.
---

# Post-merge sync

The user has a standing OK for the git part (steps 2–3): don't ask again before merging main into `qa`/`stage` and pushing. It does **not** cover database pushes or merging other PRs. Background: `docs/claude/05-git-workflow.md` → "Environments & Deploy Flow".

## 1. Identify the PR

```bash
gh pr view <number> --json number,title,state,mergeCommit,headRefName,files \
  --jq '{number,title,state,merge:.mergeCommit.oid,branch:.headRefName,files:[.files[].path]}'
```

Without a number, use the PR of the current branch (`gh pr view --json …`) or the latest one: `gh pr list --state merged --limit 3`. Stop if `state` is not `MERGED`.

If `gh` says "command not found", call it as `/usr/bin/gh`.

## 2. Update main

1. `git status --porcelain`: if there are uncommitted changes, stop and ask (don't stash on the user's behalf).
2. Remember the current branch, so you can return to it at the end if it is not the merged one.
3. `git switch main && git pull --ff-only`
4. Delete the merged local branch: `git branch -d <branch>`. If `-d` refuses, it isn't fully merged: leave it and tell the user.

## 3. Merge main into qa and stage

For each of `qa` and `stage`:

```bash
git switch <env> && git pull --ff-only && git merge --no-edit main
```

Then verify there are no file differences and push both:

```bash
git diff --name-only main qa
git diff --name-only main stage   # both must print nothing
git push origin qa stage
```

On a conflict: check whether the env branch differed from main only by history (`git diff --name-only origin/main origin/<env> -- app supabase` before the merge is empty). If so, take main's side. If there were real code differences, abort the merge (`git merge --abort`) and ask.

Finish with `git switch main` (or the branch the user was on in step 2.2).

## 4. Migrations

If the PR's files include `supabase/migrations/*`, every database must have them:

- Check what each environment has: `bun run db:link:stage && supabase migration list --linked` and `bun run db:link:prod && supabase migration list --linked` (read-only; compare the Remote column with the PR's files).
- Missing on stage → offer `! bun run db:push:stage`. Missing on production → give the user `! bun run db:push:prod`, never run it yourself. Follow the `db-migration` skill for verification.
- Production has real data: never `db reset --linked`, never bulk deletes.

## 5. Vercel deploys

Vercel reports deploy status on each commit. About a minute after the push:

```bash
for ref in main qa stage; do
  echo "== $ref"
  gh api repos/SValac/viajeros-ligeros-bun/commits/$(git rev-parse origin/$ref)/status \
    --jq '.statuses[] | "\(.context): \(.state)"'
done
```

`pending` → check again later. `failure` → open the `target_url` and report it. If the build failed during install after a dependency bump, it is usually the stale build cache: the user redeploys without cache from the Vercel dashboard.

## 6. Docs

The feature doc should have moved to `docs/features/completed/` (and been listed in `docs/claude/07-documentation.md`) inside the PR itself. If the PR's doc is still in `docs/features/` or `docs/features/pending/`, tell the user: it now needs a follow-up docs PR.

## 7. GitHub project #3

Find the item for this PR and set its Status to Done:

```bash
gh project item-list 3 --owner SValac --format json --limit 100 \
  --jq '.items[] | select(.status != "Done") | {id, title, status}'

gh project item-edit --project-id PVT_kwHOAEdRCM4Bmbm0 --id <item-id> \
  --field-id PVTSSF_lAHOAEdRCM4Bmbm0zhlEs-Y --single-select-option-id 98236657
```

Status option IDs: Backlog `f75ad846`, Ready `61e4505c`, In progress `47fc9ee4`, In review `df73e18b`, Done `98236657`. If no item matches the PR clearly, or several do, ask instead of guessing. If the token lacks the `project` scope, give the user `! gh auth refresh -h github.com -s project`.

## 8. Engram history

Engram is the history archive: one entry per merged PR, nothing else during the session. If the `mcp__engram__*` tools are not available, skip this step and say so in the report.

1. Save the PR with `mem_save`:
   - `title`: `PR #<number>: <title>`
   - `type`: `bugfix` for a fix, `decision` otherwise
   - `topic_key`: `pr/<number>` (re-running the skill updates the same entry instead of duplicating it)
   - `content`: **What** shipped, **Why** (the problem or request), **Where** (main files, migrations and the environments they reached), **Learned** (decisions taken during the PR, gotchas, follow-ups and their project #3 item). Take it from the PR body, its commits and the feature's file memory. Use repo-relative paths.
2. If the feature has a file memory that only tracked its progress, it is finished now: archive it (`engram save "Archived: <title>" "<file body>" --project viajeros-ligeros-bun`), delete the file and its `MEMORY.md` line. Keep anything that is still a rule, gotcha or open contract in file memory.

## 9. Report

Short summary for the user:

- PR number and title, merge commit.
- qa/stage: pushed, no file differences from main.
- Migrations: which environments have them, or "no migrations".
- Vercel: main/qa/stage status.
- Project #3 item moved to Done (or why not).
- Engram: observation saved (id), file memory archived (or why not).
- Anything left for the user (a `! bun run db:push:prod` line, a failed deploy, a doc to move).
