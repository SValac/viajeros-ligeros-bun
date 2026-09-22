# Código de Acceso al Viaje — Fase 0: Renombrar `travel_status`

**Objetivo:** Renombrar el valor `confirmed` → `published` en el enum `travel_status`
y actualizar todo el código frontend que dependía de ese literal.

**Dependencia:** Ninguna — esta es la primera fase.
**Estado:** Completada ✅

**Commit:** `dc2519a` (rama `fase0-rename-status`)

---

## Rol del asistente

**Modo:** Mentor / Guía de implementación
**Comportamiento:** Explicar el *por qué* antes de cada paso. No escribir código
a menos que el usuario lo pida explícitamente. El usuario escribe el código y corre
`bun run db:reset` / `bun run db:types` / `bun run typecheck` después de cada paso.

---

## Por qué

`travels.status = 'confirmed'` es hoy la condición que usa la política RLS `anon`
existente (`travels_anon_confirmed`, pensada para una futura landing page) para decidir
qué viajes son visibles públicamente. El nombre "confirmado" no transmite bien esa
idea — se renombra a `published`, que es semánticamente más claro y será también el
gate que habilite el código de acceso al viaje (Fases 1–2).

**Dato clave:** en Postgres, un valor de enum se identifica internamente por el `oid`
de su fila en `pg_enum`, no por el texto de la etiqueta. Por eso
`ALTER TYPE ... RENAME VALUE` **no rompe** nada que ya compare
`status = 'confirmed'` — esas comparaciones fueron resueltas a ese `oid` en el momento
en que se crearon, y seguirán funcionando igual, ahora bajo la etiqueta `published`,
sin tocar las migraciones viejas.

Esto **no** afecta a `quotation_status` (`draft`/`confirmed`), `quotation_bus_status`
(`reserved`/`confirmed`/`pending`), ni a las columnas booleanas `confirmed` de las
tablas de cotización — son enums/columnas distintos, sin relación con la visibilidad
pública del viaje. Cuidado de no tocarlos por error.

---

## Pasos de implementación

**0.1** Generar el archivo de migración:
```
supabase migration new rename_travel_status_confirmed_to_published
```

**0.2** Contenido de la migración (una sola línea):
```sql
alter type public.travel_status rename value 'confirmed' to 'published';
```

**0.3** Actualizar el código que usa el literal `'confirmed'` de `travel_status`:

| Archivo | Cambio |
|---|---|
| `app/types/travel.ts` | `TravelStatus`: `'confirmed'` → `'published'` |
| `app/components/travel-form.vue` | enum Zod (línea ~51) y `estadoOptions` (línea ~147, label `'Confirmado'` → `'Publicado'`) |
| `app/pages/travels/[id]/index.vue` | `getStatusColor`/`getStatusLabel` (clave y etiqueta) |
| `app/pages/travels/dashboard.vue` | `getStatusColor`/`getStatusLabel` + tarjeta de estadísticas "Confirmados" → "Publicados" (clave `stats.confirmed` → `stats.published`) |
| `app/stores/use-travel-store.ts` | `TravelStats.confirmed` → `published`; filtros en `stats` y `totalRevenue` |
| `supabase/seed.sql` | el viaje semilla con `status: 'confirmed'` → `'published'` |

**0.4** Aplicar y regenerar tipos:
```
bun run db:reset
bun run db:types
```

---

## Verificación

- `bun run typecheck` sin errores (confirma que no quedó ningún `'confirmed'` residual
  tipado contra `TravelStatus`).
- `grep -rn "'confirmed'" app/ supabase/` no debe devolver nada relacionado a
  `travel_status` (sí puede devolver resultados de `quotation_status`/`quotation_bus_status`/columnas `confirmed` booleanas — esos se dejan intactos).
- En el navegador: el filtro/badge de estado en el dashboard y en la página de detalle
  del viaje muestra "Publicado" en vez de "Confirmado".
