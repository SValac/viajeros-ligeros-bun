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

## Language

Everything written for developers is in English: file names, identifiers (variables, functions, types, props, emits), comments and documentation (`docs/`, feature plans). Text the user sees (labels, toasts, error messages, `aria-label`) stays in Spanish, and so do data values stored in Spanish. When a comment quotes UI text, quote it as is. Use the glossary in [english-names/PLAN.md](../features/completed/english-names/PLAN.md) for domain terms (cotización → quotation, hospedaje → accommodation, saldo pendiente → pending balance…).

## Components

`app/components/` is grouped by domain (`quotation/`, `travel/`, `agency/`…). Nuxt builds the name from folders + file name and drops repeated segments, so:

- The file name is the full component name: `quotation/bus/quotation-bus-form.vue` → `<QuotationBusForm>`.
- A subfolder must repeat the file prefix (`travel/calendar/travel-calendar-*.vue`); add one only for 3+ files.
- Only app-wide components (load/empty states, inputs, layout) live at the root.
- Names in English, including props, emits and exported types.

See [docs/architecture/03-components.md](../architecture/03-components.md).

## Reuse first

The general rule (smallest complete change, reuse before writing) lives in the user-level `~/.claude/CLAUDE.md`. In this repo that means looking, in this order:

1. `app/components/`, `app/composables/`, `app/utils/` (mappers, formatters, payment status helpers).
2. Nuxt UI components (`UTable`, `UInput type="date"`, `UModal`…) before native elements or hand-built widgets.
3. VueUse and installed packages before new code; no new dependency for a few lines.
4. A Supabase query or RPC that already returns the data before a new one.

Dates: always `parseDisplayDate` for date-only values, never `new Date('YYYY-MM-DD')`.

---

[← Architecture](./03-architecture.md) | [Volver al índice](../../CLAUDE.md) | [Siguiente: Git Workflow →](./05-git-workflow.md)
