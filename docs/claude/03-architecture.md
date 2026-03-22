# Architecture

## Application Structure

- **`app/`** — Main application directory (Nuxt 4 convention)
  - **`app.vue`** — Root component wrapping `UApp`, `NuxtLayout`, `NuxtPage`
  - **`layouts/`** — Layout components (currently `default.vue` with dashboard structure)
  - **`pages/`** — File-based routing pages
  - **`components/`** — Vue components (auto-imported by Nuxt)
  - **`assets/`** — Static assets and CSS

## Layout System

Dashboard layout pattern with Nuxt UI:

- `UDashboardGroup` — wraps the entire layout
- `TheSidebar` — collapsible navigation component
- `UDashboardPanel` — contains the navbar and main content area
- Sidebar is resizable and collapsible with navigation menu items

## Component Patterns

- `<script setup lang="ts">` in all components
- Nuxt UI components prefixed with `U` (e.g., `UButton`, `UDashboardSidebar`)
- Icons use Iconify notation: `i-{collection}-{name}` (e.g., `i-lucide-house`)
- Sidebar navigation uses `NavigationMenuItem[][]` type

## Modules

Configured in `nuxt.config.ts`:

| Module | Purpose |
|--------|---------|
| `@pinia/nuxt` | State management |
| `@nuxt/eslint` | ESLint integration |
| `@nuxt/ui` | UI component library |

> For detailed architectural documentation see [docs/architecture/README.md](../architecture/README.md)

---

[← Dev Commands](./02-dev-commands.md) | [Volver al índice](../../CLAUDE.md) | [Siguiente: Code Style →](./04-code-style.md)
