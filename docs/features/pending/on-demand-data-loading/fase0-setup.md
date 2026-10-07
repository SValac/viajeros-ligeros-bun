# Fase 0 — Setup de Pinia Colada

**Estado:** Pendiente
**Dependencia:** Ninguna
**Migración:** No

---

## Objetivo

Dejar Pinia Colada instalado y configurado **sin cambiar ningún comportamiento**: la app
sigue cargando todo con `init-stores.client.ts`. Esta fase solo prepara el terreno y fija
las convenciones que usan las fases siguientes.

---

## Pasos

### 1. Subir Vue

`@pinia/colada@1.4.7` pide `vue ^3.5.41`; el proyecto tiene `3.5.25`.

- Subir `vue` en `package.json` y reinstalar.
- `@pinia/colada-nuxt@1.2.0` depende de `@nuxt/kit ^4.5.2` (el proyecto está en Nuxt
  `4.2.2`). Verificar si instala limpio así o si conviene subir `nuxt` en el mismo paso.
  Si se sube Nuxt, hacerlo en **commit separado** y probar la app antes de seguir.

### 2. Instalar Colada + módulo

```bash
bun add @pinia/colada @pinia/colada-nuxt
```

- Agregar `'@pinia/colada-nuxt'` a `modules` en `nuxt.config.ts` (después de
  `'@pinia/nuxt'`).
- `@pinia/colada-devtools` es peer opcional del módulo: evaluar si vale la pena en dev.

### 3. Defaults globales — `colada.options.ts` (raíz)

Defaults de Colada 1.4.7: `staleTime: 5s`, `gcTime: 5min`, `refetchOnWindowFocus`,
`refetchOnReconnect` y `refetchOnMount` en `true`. Punto de partida propuesto:

- `staleTime` ~30 s para datos operativos (evita refetch en cada cambio de pestaña interna
  del viaje, sigue fresco entre usuarios).
- Los catálogos (Fase 5) sobrescriben con un `staleTime` largo por query.
- Mantener `refetchOnWindowFocus: true`: es lo que resuelve "el coordinador no ve mis
  cambios hasta recargar".

### 4. Convención de claves y carpeta `app/queries/`

- Un archivo por dominio: `app/queries/travels.ts`, `travelers.ts`, `quotations.ts`,
  `catalogs.ts`.
- Cada archivo exporta una **fábrica de claves** y sus `defineQueryOptions`:

  ```ts
  export const travelKeys = {
    root: ['travels'] as const,
    list: (filters: TravelListFilters) => ['travels', 'list', filters] as const,
    detail: (id: string) => ['travels', 'detail', id] as const,
  };
  ```

- Las query functions **llaman al repositorio**; nunca a `supabase` directo.
- Verificar con la doc de Colada (versión instalada, `node_modules/@pinia/colada`) la firma
  exacta de `defineQueryOptions` / `defineMutation` antes de fijar el patrón.

### 5. Auto-imports

Comprobar qué expone el módulo como auto-import (`useQuery`, `useMutation`,
`useQueryCache`…). Si algo no se auto-importa, importarlo explícito desde `@pinia/colada`
(recordar [[gotcha-typecheck-breaks-dev-server]]: hacer typecheck sobre una copia si
`nuxt dev` está corriendo).

### 6. Documentar el patrón

Agregar una sección "Carga de datos con Pinia Colada" en
`docs/architecture/02-store.md` (o `04-data-flow.md`) con la convención de claves y
cuándo usar query vs. store.

---

## Verificación

- `bun run lint:fix` y `bun run typecheck` limpios.
- `bun run dev`: login, dashboard, detalle de viaje, cotización y pagos funcionan igual
  que antes (no se cambió ninguna pantalla).
- Sin warnings nuevos en consola.

## Commits sugeridos

1. `chore(deps): bump vue to 3.5.x` (y Nuxt aparte si aplica)
2. `chore(deps): add Pinia Colada and its Nuxt module`
3. `docs(architecture): data loading with Pinia Colada`
