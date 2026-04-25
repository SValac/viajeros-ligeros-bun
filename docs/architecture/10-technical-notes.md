# 10. Consideraciones Técnicas

## TypeScript

- Usar `type` en lugar de `interface` (convención del proyecto)
- `database.types.ts` es auto-generado — no editar manualmente
- Los mappers en `utils/mappers.ts` son el único punto de conversión entre tipos de BD y tipos de dominio
- `TablesInsert<'nombre_tabla'>` y `Tables<'nombre_tabla'>` del tipo de Supabase para operaciones de BD

## Vue 3 / Nuxt 4

- `<script setup lang="ts">` en todos los componentes y páginas
- SSR deshabilitado — la app es CSR pura (`ssr: false` en `nuxt.config.ts`)
- Auto-imports habilitados: composables, stores y componentes son accesibles sin importar explícitamente
- Path alias `~` apunta a `/app/`

## Supabase

- Cliente singleton en `composables/use-supabase.ts` — usar siempre este composable, no instanciar `createClient` directamente
- Las credenciales viven en variables de entorno: `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_KEY`
- Auth manejado por `use-auth-store.ts` — no llamar a `supabase.auth` fuera de este store
- RLS (Row Level Security) configurado en Supabase para tablas protegidas

## Pinia

- Un store por dominio, Composition API style
- Los stores se cargan al inicio via plugin — los componentes pueden asumir que los datos ya están disponibles
- El quotation store tiene caché anti-duplicado (`travelFetchCache`) porque múltiples componentes en la misma página lo solicitan simultáneamente
- Getters costosos (como `getTravelerPaymentSummary`) se ejecutan sin memoización — si hay problemas de performance, considerar `computed` en el componente

## Google Maps

- SDK cargado de forma lazy con `composables/use-google-maps.ts`
- `NUXT_PUBLIC_GOOGLE_MAPS_API_KEY` y `NUXT_PUBLIC_GOOGLE_MAPS_MAP_ID` requeridos
- En producción, si `MAP_ID` no está configurado, el composable emite una advertencia
- Usar `map-location-picker.vue` para inputs y `map-location-display.vue` para lectura

## Performance

- `getBusesByProvider` en bus store pre-computa un mapa `providerId → Bus[]` para evitar `.filter()` en cada render
- `init-stores.client.ts` usa `Promise.all` para cargar todos los stores en paralelo al inicio
- Rich text editor tiene sufijo `.client.vue` — se hidrata solo en el cliente (no SSR)

## Seguridad

- `dompurify` sanitiza todo el HTML del rich text antes de renderizar con `v-html`
- Auth middleware bloquea acceso a todas las rutas protegidas antes de cargar cualquier store
- Las credenciales de Supabase son `NUXT_PUBLIC_*` (expuestas al cliente) — no incluir service role key en el frontend

## Convenciones de código

- Archivos en kebab-case
- `type` no `interface`
- 2 espacios, semicolons, single quotes
- Nombres de stores: `use-[dominio]-store.ts`
- Nombres de composables: `use-[nombre].ts`
- Componentes de sección compleja: `[dominio]-[parte]-section.vue`

---

[← Dependencias](./09-dependencies.md) | [Volver al índice](./README.md)
