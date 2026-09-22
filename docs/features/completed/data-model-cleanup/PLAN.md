# Feature: Saneamiento del modelo de datos

**Objetivo:** Sacar de las tablas operativas las columnas que no pertenecen ahí —costos,
márgenes y notas internas— para que el aislamiento por rol sea **estructural** y no
dependa de que alguien se acuerde de filtrar una columna. Incluye eliminar duplicaciones
del precio de autobús y formalizar la relación `travel_buses` ↔ `quotation_buses`.

**Complejidad:** Media — 4 migraciones, cambios concentrados en mappers/repository, y
borrado de código muerto.

**Estado:** ✅ COMPLETA — 5 fases implementadas, verificadas y desplegadas a remoto
(2026-09-22).

**⚠️ Esta feature va ANTES de [acceso de coordinadores](../../pending/coordinator-access/PLAN.md)
(rama `feature/cordinator-travel-access`, sin mergear).** La simplifica: elimina su Fase 0
y sus dos vistas — ver la sección "Efecto sobre el plan de coordinadores" más abajo. Ese
plan **todavía no se actualizó** con este efecto porque vive en una rama separada; queda
pendiente para cuando se retome ese trabajo.

---

## Contexto

Diseñando el acceso de coordinadores apareció un problema que no era de esa feature: **RLS
filtra filas, no columnas**. Cualquier rol nuevo que necesite leer un viaje se topa con que
`travels` guarda el costo y el margen de la agencia en las mismas filas que el destino y
las fechas.

La solución de corto plazo (vistas con lista de columnas explícita) funciona, pero es
**fail-open**: si mañana alguien agrega `commission_rate` a `travels`, la vista no la
filtra sola. Separar las columnas invierte eso — la columna nueva nace del lado protegido.

**La premisa importante:** los datos financieros ya están casi todos bien.
`quotations`, `quotation_*`, `payments`, `provider_payments`, `bus_payments`,
`accommodation_payments` **son tablas propias**. El problema son **4 columnas sueltas** que
quedaron dentro de tablas operativas. Esto no es una re-arquitectura; es mover 4 columnas
mal ubicadas y limpiar lo que quedó alrededor.

### El criterio de separación

No es "¿es plata?" sino **"¿lo puede ver alguien que no sea la agencia?"**. Por eso
`internal_notes` entra en la separación aunque no sea un número: es admin-only igual que el
margen. De ahí el nombre `travel_internals` y no `travel_financials` — un nombre que dice
"financiero" invita a que alguien devuelva `internal_notes` a `travels`.

---

## Hallazgos del análisis

### 1. `travels` — 3 columnas mal ubicadas

`total_operation_cost`, `projected_profit`, `internal_notes`. `price` **no** entra: es el
precio de venta al público, ya visible para viajeros y para la futura landing.

Consecuencia directa: hoy **`anon` puede leerlas** (`grant select` sobre la tabla completa
+ policy `travels_anon_confirmed`). La separación cierra esa fuga de forma estructural.

### 2. El precio de autobús está en **tres** lugares

| Ubicación | Rol | Destino |
|---|---|---|
| `buses.rental_price` | Catálogo del proveedor | ❌ Se elimina (Fase 2) |
| `quotation_buses.total_cost` | La cotización | ✅ **Fuente de verdad** |
| `travel_buses.rental_price` | Copia denormalizada | ❌ Se elimina (Fase 3) |

`travel_buses.rental_price` se escribe como copia literal de `quotation_buses.total_cost`
(`use-quotation-repository.ts:577` y `:627`). No es un snapshot histórico deliberado: es
duplicación que hay que mantener sincronizada a mano.

### 3. 🔑 `travel_buses` **ya es** un satélite de `quotation_buses`

Este fue el hallazgo que responde tu pregunta de "si pasamos o creamos los `travel_buses` a
quotation": **en la práctica la migración ya ocurrió**, solo que el esquema y el código
viejo no lo reflejan.

- Las filas de `travel_buses` las crea el flujo de cotización
  (`use-quotation-repository.ts:568`), vinculadas por `quotation_bus_id`.
- El componente vivo, `travel-buses-section.vue`, itera sobre **`QuotationBus`**, busca su
  `travel_bus` con `getTravelBusForQuotationBus()`, y guarda **solo los operadores**.
- El camino manual viejo —`travel-bus-form.vue` y `travel-bus-list.vue`, los que piden
  `rentalPrice` a mano y lo prellenan del catálogo— **es código muerto**: ningún template
  los referencia. Con ellos quedan muertos `addTravelBus` (store), `insertTravelBus` y, en
  la práctica, `insertBuses` (se llama solo al crear un viaje, donde la lista siempre
  llega vacía).

Varias columnas de `travel_buses` repiten datos de `quotation_buses` — pero **solo una de
esas repeticiones es un problema**:

| Columna | Estado |
|---|---|
| `rental_price` | ❌ Costo: no debe estar acá. **Se elimina (Fase 3)** |
| `provider_id`, `model`, `seat_count` | ✅ **Se quedan** — proyección operativa deliberada, ver abajo |
| `brand`, `year`, `bus_id` | ✅ **Se quedan** — sin escritor desde que murió el form manual, pero no molestan (decidido) |
| `operator1_*`, `operator2_*` | ✅ Propio: los choferes asignados |

### Por qué `provider_id`, `model` y `seat_count` NO se tocan

Decisión del usuario (2026-08-29): *"`travel_buses` es para saber qué autobuses están
registrados en ese viaje, y de qué agencia son — eso es totalmente visible para el
coordinador. Lo único que no debería poder ver es el costo del autobús."*

El coordinador **no puede tener acceso a `quotation_buses`**: es donde vive `total_cost`. Si
`travel_buses` perdiera esas columnas, la información que debe ver dejaría de ser
alcanzable. **La duplicación es la proyección operativa del autobús, del lado correcto de la
frontera de seguridad** — `quotation_buses` es la vista comercial (admin), `travel_buses` la
operativa (admin + coordinador).

Lo que **sí** hay que arreglar es que esa proyección está **desincronizada**: `updateBus`
(`use-quotation-repository.ts:588-630`) propaga únicamente `rental_price`. Cambiar el
proveedor, el número de unidad o la capacidad en la cotización deja `travel_buses`
desactualizado en silencio — y `seat_count` alimenta el mapa de asientos
(`traveler-form.vue:58`, `travelers/index.vue:798`), así que una capacidad vieja es un bug
visible. **Ese es el contenido real de la Fase 4.**

### ¿Y por qué no mover los operadores a `quotation_buses` y borrar `travel_buses`?

Sería una tabla menos, pero **es exactamente lo contrario de lo que estamos haciendo**:
`quotation_buses` es una tabla financiera (`total_cost`, `payment_method`, `split_type`).
Meter ahí los datos de los operadores obligaría a darle acceso a esa tabla a cualquier rol
que necesite saber quién maneja el autobús — el coordinador, justamente.

**`travel_buses` se queda, y queda confirmada como la tabla operativa del autobús.** Es la
separación correcta: la cotización es de la agencia, los operadores son de la operación.

---

## Rol del asistente

**Modo:** Mentor / Guía — igual que las features anteriores ([[feedback-mentor-mode]]).
El usuario escribe el SQL y el código, corre las verificaciones y comparte resultados
antes de avanzar de fase. **Los comandos los corre siempre el usuario**, incluyendo todo lo
que toque el proyecto remoto.

**Skills:** `@.claude/skills/supabase`,
`@.claude/skills/supabase-postgres-best-practices`, más `vue`/`nuxt`/`pinia` en las fases
con cambios de UI.

---

## Índice de documentos por fase

| Documento | Contenido | Dependencia | Estado |
|---|---|---|---|
| [fase1-travel-internals.md](fase1-travel-internals.md) | Separar `travel_internals` de `travels` | Ninguna | ✅ Completa |
| [fase2-catalogo-bus-precio.md](fase2-catalogo-bus-precio.md) | Eliminar `buses.rental_price` del catálogo | Ninguna | ✅ Completa |
| [fase3-travel-bus-precio.md](fase3-travel-bus-precio.md) | Eliminar `travel_buses.rental_price` + borrar el código muerto | Fase 2 | ✅ Completa |
| [fase4-travel-bus-satelite.md](fase4-travel-bus-satelite.md) | 🔴 Arreglar la sincronización `quotation_buses` → `travel_buses` + `UNIQUE` | Fase 3 | ✅ Completa |
| [fase5-verificacion.md](fase5-verificacion.md) | Verificación + despliegue | Todas | ✅ Completa |

Las Fases 1 y 2 son **independientes**. La 4 dejó de ser opcional: contiene un bugfix con
impacto de usuario (ver hallazgo 3).

---

## ⚠️ Esta feature borra columnas — no aplicó en este despliegue

Las migraciones aplican `DROP COLUMN`, que normalmente no se puede deshacer con un rollback
sobre datos reales. **Resultó no ser un riesgo en este despliegue**: el proyecto remoto
(`mkosbzhagjbyfvizafta`) estaba `INACTIVE` (pausado) y sin datos — se reactivó
específicamente para este push. Ver Fase 5 para el detalle.

Si en el futuro se repite este tipo de migración (`DROP COLUMN`) contra una base con datos
reales, sí correr el checklist completo: backup del proyecto, confirmar que ningún
reporte/export externo usa la columna, y comparar valores antes de borrar.

---

## Efecto sobre el plan de coordinadores

| Antes | Después |
|---|---|
| Fase 0 (hardening `anon`) | ❌ **Se elimina** — resuelta estructuralmente por la Fase 1 |
| Vista `coordinator_travels` | ❌ Innecesaria — policy `SELECT` normal sobre `travels` |
| Vista `coordinator_travel_buses` | ❌ Innecesaria — policy `SELECT` normal sobre `travel_buses` |
| `security_invoker = false` | ❌ Desaparece la excepción a la best practice |
| Fases 1, 3, 4, 5 | Sin cambios |

La Fase 2 de coordinadores queda como policies aditivas planas, sin vistas ni excepciones.

---

## Fuera de alcance

- Tocar `quotations`, `payments`, `provider_payments`, `bus_payments`,
  `accommodation_payments` — ya están correctamente separadas.
- `coordinators.notes` (¿es interno de la agencia?) — es una decisión abierta del plan de
  coordinadores; si resulta que sí, se resuelve ahí con el mismo criterio.
- Rediseñar el flujo de cotización.
- Cambiar `travel_accommodations` (no tiene columnas de costo — ya está bien).
- **Qué hacer con los asientos ya asignados cuando cambia la capacidad de un autobús.** El
  `UNIQUE (travel_id, travel_bus_id, seat)` no valida contra `seat_count`, así que bajar la
  capacidad deja viajeros en asientos que ya no existen. El usuario confirmó que se está
  analizando una **feature aparte** para resolverlo, con su propio plan. La Fase 4 se limita
  a que la capacidad esté actualizada.
