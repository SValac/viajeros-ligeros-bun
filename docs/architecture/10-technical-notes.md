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
- Los datos **no** están disponibles al montar: cada pantalla monta su query (o usa el store del catálogo) y muestra spinner → error + Reintentar → vacío → contenido. Un estado vacío antes de cargar sería mentira
- Redirecciones de "no encontrado" solo cuando la query resolvió (`status === 'success' && data === null`, o `isLoaded` en catálogos), con `watch` y no `watchEffect`
- La cotización pasa por `quotationByTravelQuery`, que deduplica y copia el resultado al store (ver [Flujo de datos](./04-data-flow.md#carga-de-datos-con-pinia-colada))
- Getters costosos (como `getTravelerPaymentSummary`) se ejecutan sin memoización — si hay problemas de performance, considerar `computed` en el componente

## Google Maps

- SDK cargado de forma lazy con `composables/use-google-maps.ts`
- `NUXT_PUBLIC_GOOGLE_MAPS_API_KEY` y `NUXT_PUBLIC_GOOGLE_MAPS_MAP_ID` requeridos
- En producción, si `MAP_ID` no está configurado, el composable emite una advertencia
- Usar `map-location-picker.vue` para inputs y `map-location-display.vue` para lectura

## Performance

- `getBusesByProvider` en bus store pre-computa un mapa `providerId → Bus[]` para evitar `.filter()` en cada render
- Nada se carga al arrancar: cada pantalla pide su alcance con Pinia Colada (un viaje, un mes, una página) y los catálogos se piden la primera vez que una pantalla usa su store
- Rich text editor tiene sufijo `.client.vue` — se hidrata solo en el cliente (no SSR)

## Seguridad

- `dompurify` sanitiza todo el HTML del rich text antes de renderizar con `v-html`
- Auth middleware bloquea acceso a todas las rutas protegidas antes de cargar cualquier store
- Las credenciales de Supabase son `NUXT_PUBLIC_*` (expuestas al cliente) — no incluir service role key en el frontend
- **Toda columna nueva de costo, margen o nota interna de un viaje va a `travel_internals`, nunca a `travels`.** RLS filtra filas, no columnas — mezclar datos admin-only con datos operativos en la misma tabla es una fuga estructural esperando a pasar (ver `docs/features/completed/data-model-cleanup/PLAN.md`).

## Convenciones de código

- Archivos en kebab-case
- `type` no `interface`
- 2 espacios, semicolons, single quotes
- Nombres de stores: `use-[dominio]-store.ts`
- Nombres de composables: `use-[nombre].ts`
- Componentes de sección compleja: `[dominio]-[parte]-section.vue`

---

[← Dependencias](./09-dependencies.md) | [Volver al índice](./README.md)
