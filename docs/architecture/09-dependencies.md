# 9. Dependencias

## Dependencias de producción

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `nuxt` | 4.2.2 | Framework principal (CSR, no SSR) |
| `vue` | 3.5.25 | UI framework |
| `@nuxt/ui` | 4.3.0 | Componentes UI (basado en Tailwind CSS) |
| `@pinia/nuxt` | 0.11.3 | State management |
| `@supabase/supabase-js` | 2.104.1 | Cliente de base de datos y auth |
| `@tiptap/vue-3` y plugins | ~3.22.3 | Editor rich text |
| `@vueuse/core` | 14.1.0 | Composables utilitarios de Vue |
| `zod` | 4.2.1 | Validación de schemas en runtime |
| `dompurify` | 3.3.3 | Sanitización de HTML (previene XSS en rich text) |
| `vue3-emoji-picker` | 1.1.8 | Selector de emoji |

## Dependencias de desarrollo

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `typescript` | 5.9.3 | Tipado estático |
| `@nuxt/eslint` | — | Linting con reglas de Nuxt |
| `bun` | runtime | Ejecución, testing, bundling |

## Comandos útiles

```bash
# Desarrollo
bun run dev

# Linting
bun run lint:fix

# Typecheck
bun run typecheck

# Regenerar tipos de Supabase
bunx supabase gen types typescript --project-id <id> > app/types/database.types.ts
```

---

[← Estructura de Archivos](./08-file-structure.md) | [Volver al índice](./README.md) | [Siguiente: Consideraciones Técnicas →](./10-technical-notes.md)
