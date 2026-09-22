# Feature: Acceso de Coordinadores (app móvil propia para coordinadores)

**Objetivo:** Dar a los coordinadores de una agencia una **identidad real** (usuario de
Supabase Auth) vinculada a su registro existente en `coordinators`, y abrir un **segundo
eje de autorización** en RLS para que, desde una app móvil propia (fuera de alcance),
puedan ver y editar **itinerario, viajeros y fotos** de los viajes a los que están
asignados — sin ver **nada** de la información financiera de la agencia.

**Complejidad:** Media — 3 migraciones nuevas (identidad + RLS lectura + RLS escritura),
1 Edge Function nueva (primera del repo), UI de invitación en la web admin.

**Estado:** 📋 PLANIFICADO — ninguna fase iniciada. Dependencia satisfecha, listo para
arrancar la Fase 1.

**✅ Dependencia satisfecha:** [Saneamiento del modelo de datos](../completed/data-model-cleanup-PLAN.md)
está completo, verificado y mergeado a `main` (2026-09-22). Esa feature sacó las columnas
financieras de `travels` y `travel_buses`, lo que simplifica bastante este plan (ver
"Contexto de diseño"). Esta rama ya tiene `main` integrado (merge, no rebase) — el esquema
y el código de esa feature están presentes acá.

---

## Contexto

Hoy el proyecto tiene **un solo eje de autorización**: todas las políticas RLS evalúan
`auth.uid() = owner_id`, donde el `owner_id` es el admin dueño de la agencia
(`20260614225929_multitenant_owner_rls.sql`). Un coordinador no tiene identidad: la tabla
`coordinators` es un **directorio** propiedad de la agencia (`name`, `age`, `phone`,
`email`, `notes`, `owner_id`), sin ninguna relación con `auth.users`. La asignación
coordinador↔viaje ya existe en `travel_coordinators (travel_id, coordinator_id)`.

Esta feature agrega el segundo eje. La consecuencia más importante del modelo actual es
favorable: como toda política existente exige `auth.uid() = owner_id`, un coordinador que
se loguee **hoy no vería absolutamente nada**. El sistema **falla cerrado**, así que todo
acceso que se le dé va a ser explícito y deliberado, nunca heredado por accidente.

### Por qué NO se reusa el patrón del código de acceso

Se evaluó reusar el mecanismo de [código de acceso al viaje](travel-access-code-PLAN.md)
(teléfono + código de 6 caracteres, `anon`, stateless). Se **descartó** porque el
coordinador **escribe**, y un código compartido rompe por tres lados:

1. **Sin atribución** — con 2+ coordinadores en un viaje, no hay forma de saber quién
   modificó el itinerario.
2. **Sin revocación individual** — dar de baja a un coordinador obligaría a rotar el
   código, echando también a los demás.
3. **Se reenvía** — el código viaja por WhatsApp y queda en el chat. Tolerable para
   lectura de itinerario; inaceptable para mutación de datos.

Además el ciclo de vida es distinto: un viajero existe para *un* viaje; un coordinador es
**personal de la agencia** y trabaja en muchos viajes durante años.

### Decisiones ya confirmadas con el usuario

1. **Identidad real de Supabase Auth** para cada coordinador, vinculada al registro
   existente vía `coordinators.user_id` (nullable — un coordinador del directorio puede no
   tener cuenta nunca).
2. **Alcance de edición:** itinerario (`travel_activities`), viajeros (`travelers`) y
   fotos (`travel_media` + bucket `travel-gallery`).
3. **Cero acceso financiero:** `quotations`, `quotation_*`, `payments`,
   `provider_payments`, `bus_payments`, `accommodation_payments`. Ninguna política nueva
   toca estas tablas.
4. **Autobuses visibles, costo oculto:** el coordinador ve qué autobuses están registrados
   en el viaje y **de qué agencia son** (`travel_buses` + `providers`). Lo único vedado es
   el costo que se fija en la cotización (`quotation_buses.total_cost`). Esto tiene una
   consecuencia sobre el saneamiento — ver Fase 2, Bloque 2b.
5. **Políticas aditivas**, no reemplazo: las policies `*_owner` existentes quedan
   intactas. Las permissive se combinan con `OR`, así que el admin no pierde nada.

---

## Contexto de diseño: el problema de columnas, resuelto aguas arriba

**RLS filtra filas, no columnas.** Cuando se diseñó este plan, `travels` guardaba
`total_operation_cost`, `projected_profit` e `internal_notes`, y `travel_buses` guardaba
`rental_price`. Darle una policy `SELECT` a un coordinador sobre esas tablas le mostraba
los márgenes de la agencia, y un `GRANT SELECT (columnas)` tampoco servía porque el admin y
el coordinador comparten el **mismo rol de Postgres** (`authenticated`).

La primera versión de este plan lo resolvía con dos vistas de columnas explícitas
(`coordinator_travels`, `coordinator_travel_buses`) y `security_invoker = false`. Funcionaba,
pero era **fail-open**: una columna financiera nueva en `travels` no habría quedado filtrada
sola.

**Se descartó a favor de separar las columnas en el esquema**, lo que hace la feature de
[saneamiento del modelo de datos](../completed/data-model-cleanup-PLAN.md). Consecuencias para este plan:

- Desaparece la Fase 0 (hardening de `anon`) — quedó resuelta estructuralmente
- Desaparecen las dos vistas: `travels` y `travel_buses` van con policy `SELECT` normal
- Desaparece la excepción `security_invoker = false`
- Las Fases 1, 3, 4 y 5 no cambian

Lo que **sí** sigue vigente de aquel análisis: el aislamiento de las tablas financieras
(`quotations`, `payments`, `*_payments`, y ahora `travel_internals`) se logra **no dándoles
policy**. El fail-closed hace el trabajo.

> **Alternativa descartada en su momento:** rol de Postgres propio (`coordinator`) vía
> custom access token hook, que sí habilitaría `GRANT SELECT (columnas)`. Es el camino
> "correcto" de Postgres puro, pero exige el hook de JWT, un rol nuevo y grants en cada
> tabla. Para el volumen actual (2 coordinadores) es desproporcionado. Reconsiderar si el
> modelo de roles crece (ej. proveedores o choferes con app propia).

---

## Rol del asistente

**Modo:** Mentor / Guía de implementación — igual que en la feature de código de acceso
(ver [[feedback-mentor-mode]]).
**Comportamiento:** explicar el *por qué* y el *cómo* de cada fase antes de que el usuario
escriba código. No implementar los archivos directamente. El usuario escribe el SQL, corre
las verificaciones (`db:reset`, `db:types`, `typecheck`, `lint:fix`, advisors, pruebas
manuales) y comparte los resultados para revisión antes de avanzar.

**Comandos:** los corre siempre el usuario, nunca el asistente — incluye todo lo que toque
Supabase remoto (`db:push`).

**Skills a cargar según la fase:**

```
@.claude/skills/supabase                           ← Fases 1-5
@.claude/skills/supabase-postgres-best-practices   ← Fases 1-3, 5
@.claude/skills/vue @.claude/skills/nuxt
@.claude/skills/nuxt-ui @.claude/skills/pinia      ← Fase 4 (UI)
```

---

## Índice de documentos por fase

| Documento | Contenido | Dependencia | Estado |
|---|---|---|---|
| [fase1-identidad.md](plan/coordinator-access-fase1-identidad.md) | Schema `private`, `coordinators.user_id`, helpers `is_travel_coordinator` / `can_coordinator_edit` | Ninguna | Pendiente |
| [fase2-rls-lectura.md](plan/coordinator-access-fase2-rls-lectura.md) | Policies `SELECT` aditivas sobre las tablas operativas | Fase 1 · **saneamiento mergeado** | Pendiente |
| [fase3-rls-escritura.md](plan/coordinator-access-fase3-rls-escritura.md) | Policies `INSERT`/`UPDATE`/`DELETE` + policy de Storage | Fase 2 | Pendiente |
| [fase4-invitacion.md](plan/coordinator-access-fase4-invitacion.md) | Edge Function `invite-coordinator` + UI de invitación en la web admin | Fase 1 | Pendiente |
| [fase5-verificacion.md](plan/coordinator-access-fase5-verificacion.md) | Matriz de aislamiento end-to-end + advisors | Todas | Pendiente |

> Al terminar cada fase, actualizar su "Estado" acá y en el propio documento de la fase
> (`Pendiente` → `Completada ✅`), para poder retomar en cualquier sesión sin perder
> contexto. Misma convención que la feature de código de acceso.

La **Fase 4 solo depende de la 1**, así que puede ir en paralelo con 2-3 — y es la única
que no necesita el saneamiento mergeado.

---

## Estructura objetivo (global)

```
supabase/
├── migrations/
│   ├── <ts>_coordinator_identity.sql              ← Fase 1
│   ├── <ts>_coordinator_rls_read.sql              ← Fase 2
│   └── <ts>_coordinator_rls_write.sql             ← Fase 3
└── functions/
    └── invite-coordinator/index.ts                ← Fase 4 (primera Edge Function del repo)

app/
├── types/coordinator.ts                            ← Fase 4 (modificado: userId, invitedAt)
├── composables/coordinators/
│   ├── use-coordinator-repository.ts               ← Fase 4 (modificado)
│   └── use-coordinator-domain.ts                   ← Fase 4 (modificado)
├── stores/use-coordinator-store.ts                 ← Fase 4 (modificado)
└── components/coordinator-invite-button.vue        ← Fase 4 (nuevo)
```

> Los nombres de archivo de migración se generan **siempre** con
> `supabase migration new <nombre>` — nunca a mano.

---

## Modelo de autorización resultante

| Recurso | Admin (`owner_id`) | Coordinador asignado | `anon` |
|---|---|---|---|
| `travels` | RW completo | R (solo lectura) | SELECT si `published` |
| `travel_internals` | RW | ❌ **sin acceso** | ❌ |
| `travel_activities` | RW | R siempre · W si `published`/`in_progress` | SELECT si `published` |
| `travelers` | RW | R siempre · W si `published`/`in_progress` | ❌ |
| `travel_media` + bucket | RW | R siempre · W si `published`/`in_progress` | SELECT si `published` |
| `travel_buses`, `travel_services`, `travel_accommodations` | RW | R (solo lectura) | parcial |
| `providers` | RW | R — solo los usados por sus viajes | ❌ |
| `quotations`, `quotation_*`, `payments`, `*_payments` | RW | ❌ **sin acceso** | ❌ |
| `coordinators` | RW | ⚠️ decisión abierta (Fase 2, Bloque 2a) | ❌ |
| `buses`, `hotel_rooms`, `hotel_room_types` | RW | ❌ sin acceso | ❌ |

**Lectura vs. escritura:** la membresía habilita **leer siempre** (el coordinador conserva
el historial de viajes ya `completed`), pero **escribir solo** mientras el viaje esté en
`published` o `in_progress`. Por eso hay dos helpers y no uno.

---

## Fuera de alcance (confirmado)

- La app móvil de coordinadores en sí.
- Roles granulares entre coordinadores (todos los asignados a un viaje tienen el mismo
  permiso). Si más adelante hace falta "coordinador líder" vs. "asistente", el lugar
  natural es una columna `role` en `travel_coordinators`.
- Auditoría / historial de cambios (quién editó qué y cuándo). El modelo de identidad que
  esta feature introduce es el **prerequisito** para poder agregarlo después; hoy no sería
  posible.
- Notificaciones push a coordinadores.
- Que el coordinador cree o elimine viajes — solo edita los que la agencia le asignó.
