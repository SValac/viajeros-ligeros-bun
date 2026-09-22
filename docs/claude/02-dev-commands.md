# Development Commands

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

# Supabase local
bun run db:start   # levanta Supabase local (Docker)
bun run db:reset   # aplica migraciones + corre supabase/seed.sql
bun run db:types   # regenera app/types/database.types.ts
bun run db:push    # aplica migraciones pendientes al proyecto remoto
```

`bun run db:reset` deja la base con datos de ejemplo y un usuario de desarrollo ya logueable:
`dev@viajeros-ligeros.local` / `password123` (solo existe en local, sembrado en
`supabase/seed.sql`).

---

[← Project Overview](./01-project-overview.md) | [Volver al índice](../../CLAUDE.md) | [Siguiente: Architecture →](./03-architecture.md)
