# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Nuxt 4 application for "Viajeros Ligeros" (Light Travelers), using Bun as the package manager and runtime. The app is built with Vue 3, Pinia for state management, Nuxt UI for the component library, and follows a dashboard-based architecture.

## Development Commands

```bash
# Install dependencies
bun install

# Start development server (http://localhost:3000)
bun run dev

# Type checking
bun run typecheck

# Linting
bun run lint
bun run lint:fix

# Build for production
bun run build

# Preview production build
bun run preview
```

## Architecture

### Application Structure

- **app/** - Main application directory (Nuxt 4 convention)
  - **app.vue** - Root component wrapping UApp, NuxtLayout, and NuxtPage
  - **layouts/** - Layout components (currently uses default.vue with dashboard structure)
  - **pages/** - File-based routing pages
  - **components/** - Vue components (auto-imported by Nuxt)
  - **assets/** - Static assets and CSS

### Layout System

The application uses a **dashboard layout pattern** with Nuxt UI components:

- `UDashboardGroup` wraps the entire layout
- `TheSidebar` component provides collapsible navigation
- `UDashboardPanel` contains the navbar and main content area
- Sidebar is resizable and collapsible with navigation menu items

### Component Patterns

- Components use Vue 3 Composition API with `<script setup lang="ts">`
- Nuxt UI components are prefixed with `U` (e.g., `UButton`, `UDashboardSidebar`)
- Icons use Iconify notation: `i-{collection}-{name}` (e.g., `i-lucide-house`)
- The sidebar navigation uses `NavigationMenuItem[][]` type for menu structure

### Modules

Configured Nuxt modules (nuxt.config.ts:5):

- `@pinia/nuxt` - State management
- `@nuxt/eslint` - ESLint integration
- `@nuxt/ui` - UI component library

## Code Style

Uses **@antfu/eslint-config** with the following rules:

- **Stylistic**: 2-space indentation, semicolons required, single quotes
- **Filenames**: kebab-case required (enforced by unicorn/filename-case)
- **Vue**: Max 2 attributes per line in single-line, 1 per line in multiline
- **TypeScript**: Use `type` instead of `interface` (ts/consistent-type-definitions)
- **Imports**: Auto-sorted with perfectionist/sort-imports
- **Console**: Allowed (no-console is off)
- **Process.env**: Only NODE_ENV is allowed (node/no-process-env)

## Git Workflow

- **Husky** pre-commit hook runs lint-staged
- **lint-staged** runs `bun run lint` on all staged files before commit

## TypeScript

Uses Nuxt's TypeScript configuration system with references to generated configs in .nuxt/ directory. Run `bun run typecheck` to validate types.

## Project Documentation

- **ARCHITECTURE_PLAN.md** - Complete architectural plan created by software-architect agent with 4 implementation phases, data flows, validations, and technical considerations
- **TRAVEL_FEATURE.md** - Implementation status for Feature 1: Create Travel (Phases 1-2 completed)
- **FEATURE_ITINERARY_SERVICES.md** - Implementation plan for Feature 2: Itinerary and Services Management (Phase 3 - In Planning)
