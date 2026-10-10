# Feature: Carga de datos bajo demanda con Pinia Colada

**Objetivo:** Que el CRM cargue **solo lo que cada pantalla usa**, en vez de bajar toda la
base del usuario al arrancar. Los datos operativos (viajes, viajeros, cotizaciones) se piden
por pantalla y por alcance (un viaje, un mes, una página); los catálogos se cargan la
primera vez que se necesitan. La capa de caché la pone **Pinia Colada**.

**Complejidad:** Alta — toca los stores más grandes (`use-travel-store`,
`use-traveler-store`, `use-cotizacion-store`) y ~20 pantallas/componentes, pero se hace por
fases y la app funciona entre una fase y otra. Sin migraciones previstas (ver
"Base de datos").

**Estado:** Pendiente — planificada el 2026-10-07, es la **siguiente feature**.

---

## Contexto

### Cómo carga hoy

`app/plugins/init-stores.client.ts` llama, al arrancar, el `fetchAll()` de 7 stores:
proveedores, coordinadores, autobuses, habitaciones, **viajes, viajeros y cotizaciones**.
Sin filtros ni paginación — solo RLS. Las páginas leen de esos arreglos en memoria
(`allTravels`, `getTravelById`, `getTravelersByTravel`…).

El viaje se baja completo con todas sus relaciones
(`use-travel-repository.ts:21`: `travel_activities`, `travel_services`, `travel_buses`,
`travel_accommodations`, `travel_coordinators`, `travel_internals`).

### Por qué hay que cambiarlo

1. **Corte silencioso a 1000 filas.** PostgREST tiene `max_rows = 1000`
   (`supabase/config.toml:24`, mismo default en remoto). Pasado eso devuelve 1000 filas
   **sin error**, y como todo ordena por `created_at desc`, se pierden las más viejas:
   - **Viajeros** (todos los viajes juntos) es el primero en llegar: ~25 viajes de 40
     personas. Síntoma: calendario y `/payments` muestran 0 viajeros en viajes viejos.
   - **Viajes**: el detalle `/travels/<id>` solo busca en el store, así que un viaje
     fuera del corte da "no encontrado".
2. **Carga inicial que crece sin techo**: itinerarios y alojamientos de todos los viajes,
   incluidos los completados de hace años, en cada recarga/login.
3. **Datos viejos entre usuarios**: coordinadores y dueño editan en paralelo y nadie ve
   los cambios del otro hasta recargar.

### Lo que ya está bien (y se toma como modelo)

- Pagos y galería **ya** cargan por viaje (`fetchByTravel`, `fetchForTravel`).
- `use-cotizacion-store.ts:604` ya tiene a mano lo que Colada da hecho: caché por viaje
  (`travelFetchCache`) + dedupe de peticiones en vuelo (`travelFetchInFlight`).
- Los **repositorios** (`app/composables/*/use-*-repository.ts`) se quedan: Colada solo
  reemplaza la capa que decide *cuándo* pedir y *dónde* guardar el resultado.

---

## Decisiones tomadas

| Decisión | Elegido | Por qué |
|---|---|---|
| Capa de caché | **Pinia Colada** (opción B) en vez de generalizar el caché manual (opción A) | Con claves por filtros/página/mes, el caché manual termina siendo una librería casera. Colada da claves, dedupe, `staleTime`, invalidación tras mutaciones y refetch al volver a la pestaña. Es la capa oficial de Pinia y se monta sobre `@pinia/nuxt`. `ssr: false` evita toda la complejidad de hidratación. |
| Adopción | **Piloto primero** (Fase 1: detalle de viaje) con punto de decisión explícito | Si el piloto no convence, se vuelve a la opción A sin haber reescrito el resto. |
| Catálogos vs. operativos | Catálogos completos en caché con `staleTime` largo; operativos por alcance | Los catálogos son pocos y se usan en selects de toda la app; los operativos crecen sin techo. |
| Conteos | En el servidor (embebido `travelers(count)`), no `.length` sobre arreglos | Evita bajar miles de filas para contar. |
| Repositorios | Sin cambios de forma; se agregan métodos (`fetchById`, `fetchSummaries`…) | Mantiene el patrón Domain + Repository ya establecido. |

Versiones verificadas el 2026-10-07: `@pinia/colada@1.4.7` (peer: `vue ^3.5.41`,
`pinia ^3`), `@pinia/colada-nuxt@1.2.0`. El proyecto tiene `vue 3.5.25` → **hay que subir
Vue** (Fase 0).

---

## Patrón objetivo

```
Página / componente
   │  useQuery(travelDetailQuery(id))      ← lee
   │  useMutation(updateTravelMutation)    ← escribe
   ▼
app/queries/<dominio>.ts                   ← claves + defineQueryOptions / defineMutation
   │  invalidateQueries / setQueryData
   ▼
app/composables/<dominio>/use-*-repository.ts   ← Supabase (sin cambios de forma)
```

- **Claves jerárquicas** por dominio, para invalidar por prefijo:
  `['travels']` → `['travels', 'list', filtros]`, `['travels', 'detail', id]`;
  `['travelers', 'by-travel', travelId]`; `['quotations', 'by-travel', travelId]`;
  `['catalog', 'providers']`…
- **Lecturas**: `useQuery` con las opciones de `app/queries/`. Nada de `fetchAll()` global.
- **Escrituras**: `useMutation` (o acciones de store mientras dura la migración) que al
  terminar invalidan las claves afectadas. Ej.: editar un viaje invalida
  `['travels', 'detail', id]` y `['travels', 'list']`.
- **Pinia stores** quedan solo para estado de cliente (filtros de UI, selección, borradores)
  o desaparecen si se quedan vacíos.

---

## Base de datos

**No se prevén migraciones.** Lo nuevo se resuelve con consultas PostgREST:

- Conteo de viajeros por viaje embebido en el listado:
  `.select('id, label, …, travelers(count)')` filtrando `kind = 'traveler'` para igualar a
  `payingTravelers` de hoy (verificar en Fase 2 que el filtro sobre el embebido funciona).
- Totales por estado del dashboard: consultas `head: true, count: 'exact'` por estado.
- Calendario: rango de fechas que se solapa con el mes visible.

Si alguna no funciona como se espera, el plan B es una **vista `security_invoker`**
(expand-only, no destructiva). Prod tiene datos reales: cualquier migración sigue las reglas
de [Production data safety](../../../claude/05-git-workflow.md#production-data-safety).

---

## Índice de documentos por fase

| Documento | Contenido | Dependencia | Estado |
|---|---|---|---|
| [fase0-setup.md](fase0-setup.md) | Subir Vue, instalar Colada + módulo Nuxt, defaults, convención de claves | Ninguna | Completada ✅ |
| [fase1-detalle-viaje.md](fase1-detalle-viaje.md) | **Piloto**: viaje por id con `useQuery`; corrige el "no encontrado" tras 1000 viajes · punto de decisión | Fase 0 | Pendiente |
| [fase2-listados-viajes.md](fase2-listados-viajes.md) | Listados ligeros + conteos en servidor: dashboard, calendario, `/quotations`, `/payments`; adiós `travelsStore.travels` | Fase 1 | Pendiente |
| [fase3-viajeros.md](fase3-viajeros.md) | Viajeros y asignaciones de habitación por viaje; adiós `travelerStore.fetchAll()` | Fase 2 | Pendiente |
| [fase4-cotizaciones.md](fase4-cotizaciones.md) | Cotizaciones por viaje; el caché manual pasa a Colada; desacoplar cotización ↔ viaje | Fase 1 | Pendiente |
| [fase5-catalogos.md](fase5-catalogos.md) | Proveedores, coordinadores, autobuses, habitaciones bajo demanda; borrar `init-stores.client.ts` | Fases 2-4 | Pendiente |
| [fase6-verificacion.md](fase6-verificacion.md) | Prueba con >1000 filas, auditoría de red, docs de arquitectura, cierre | Todas | Pendiente |

> Al terminar cada fase, actualizar su "Estado" acá y en el propio documento de la fase
> (`Pendiente` → `Completada ✅`).

**Entrega:** cada fase deja la app funcionando, así que cada una puede ser su propio PR
(merge commit, como el resto del repo). Fase 0 + Fase 1 pueden ir juntas en el PR piloto.
Rama inicial: `feature/on-demand-data-loading`.

---

## Rol del asistente

**Modo:** Mentor / Guía de implementación (confirmado 2026-10-07 — el objetivo es aprender
Pinia Colada).
**Comportamiento:** explicar el *por qué* y el *cómo* de cada paso antes de que el usuario
escriba código. No implementar los archivos directamente. El usuario escribe el código,
corre las verificaciones (`lint:fix`, `typecheck`, pruebas manuales) y comparte los
resultados para revisión antes de avanzar.

**Commits:** al terminar y verificar cada fase, el asistente crea los commits separados por
tema y actualiza el "Estado" de la fase acá y en su documento.

**Skills a cargar según la fase:**

```
@.claude/skills/pinia @.claude/skills/vue-best-practices   ← todas
@.claude/skills/nuxt                                       ← Fase 0
@.claude/skills/supabase                                   ← Fases 1-3 (consultas)
@.claude/skills/nuxt-ui                                    ← Fase 2 (paginación/filtros)
```

---

## Fuera de alcance

- **Pagos y galería** ya cargan por viaje; migrarlos a Colada es opcional y queda para
  después (salvo el alcance de `/payments` que entra en Fase 2).
- **Realtime** (suscripciones de Supabase): Colada con `refetchOnWindowFocus` cubre el
  caso de datos viejos por ahora.
- **Optimización de imágenes**: feature aparte,
  [image-optimization.md](../image-optimization.md).
