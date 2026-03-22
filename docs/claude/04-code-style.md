# Code Style

Uses **@antfu/eslint-config** with the following rules:

| Rule | Value |
|------|-------|
| Indentation | 2 spaces |
| Semicolons | Required |
| Quotes | Single |
| Filenames | kebab-case (enforced by `unicorn/filename-case`) |
| Vue attributes | Max 1 per line in multiline, max 2 in single-line |
| TypeScript | `type` instead of `interface` (`ts/consistent-type-definitions`) |
| Imports | Auto-sorted (`perfectionist/sort-imports`) |
| `console` | Allowed (`no-console` is off) |
| `process.env` | Only `NODE_ENV` allowed (`node/no-process-env`) |

---

[← Architecture](./03-architecture.md) | [Volver al índice](../../CLAUDE.md) | [Siguiente: Git Workflow →](./05-git-workflow.md)
