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

## Components

`app/components/` is grouped by domain (`quotation/`, `travel/`, `agency/`…). Nuxt builds the name from folders + file name and drops repeated segments, so:

- The file name is the full component name: `quotation/bus/quotation-bus-form.vue` → `<QuotationBusForm>`.
- A subfolder must repeat the file prefix (`travel/calendar/travel-calendar-*.vue`); add one only for 3+ files.
- Only app-wide components (load/empty states, inputs, layout) live at the root.
- Names in English, including props, emits and exported types.

See [docs/architecture/03-components.md](../architecture/03-components.md).

---

[← Architecture](./03-architecture.md) | [Volver al índice](../../CLAUDE.md) | [Siguiente: Git Workflow →](./05-git-workflow.md)
