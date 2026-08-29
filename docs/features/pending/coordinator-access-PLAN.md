# Feature: Acceso de Coordinadores (app móvil propia para coordinadores)

**Objetivo:** Dar a los coordinadores de una agencia una **identidad real** (usuario de
Supabase Auth) vinculada a su registro existente en `coordinators`, y abrir un **segundo
eje de autorización** en RLS para que, desde una app móvil propia (fuera de alcance),
puedan ver y editar **itinerario, viajeros y fotos** de los viajes a los que están
asignados — sin ver **nada** de la información financiera de la agencia.

**Complejidad:** Media-Alta — 4 migraciones nuevas (hardening + identidad + RLS lectura +
RLS escritura), 1 Edge Function nueva (primera del repo), UI de invitación en la web admin.

**Estado:** 📋 PLANIFICADO — ninguna fase iniciada.

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
4. **Políticas aditivas**, no reemplazo: las policies `*_owner` existentes quedan
   intactas. Las permissive se combinan con `OR`, así que el admin no pierde nada.

---

## Los dos problemas de diseño que definen el plan

### 1. RLS es a nivel de fila, no de columna

`public.travels` contiene columnas financieras: **`total_operation_cost`,
`projected_profit`, `internal_notes`** (y `price`, que sí es público). Una policy
`SELECT` para coordinadores sobre `travels` les mostraría los márgenes de la agencia — RLS
no puede filtrar columnas.

Tampoco sirve un `GRANT SELECT (col, ...)`: el admin y el coordinador comparten el **mismo
rol de Postgres** (`authenticated`), y los grants son por rol.

**Solución adoptada:** los coordinadores **no reciben ninguna policy sobre `travels`**. El
encabezado del viaje se lee por una vista `public.coordinator_travels` con lista de
columnas explícita. Las tablas hijas (`travel_activities`, `travelers`, `travel_media`) no
tienen columnas financieras, así que ésas sí van con políticas RLS normales.

> **Alternativa descartada:** rol de Postgres propio (`coordinator`) vía custom access
> token hook, que sí habilitaría `GRANT SELECT (columnas)`. Es el camino "correcto" de
> Postgres puro, pero exige el hook de JWT, un rol nuevo y grants en cada tabla. Para el
> volumen actual (2 coordinadores) es desproporcionado. Reconsiderar si el modelo de roles
> crece (ej. proveedores o choferes con app propia).

### 2. 🔴 Hallazgo: las columnas financieras ya están expuestas a `anon`

Al analizar lo anterior se encontró un **bug de seguridad preexistente**, ajeno a esta
feature pero de la misma clase:

```sql
-- 20260424031824_travels.sql
grant select on table "public"."travels" to "anon";
-- 20260506230433_rls_single_admin_policies.sql
CREATE POLICY "travels_anon_confirmed" ON public.travels
  FOR SELECT TO anon USING (status = 'confirmed');  -- hoy 'published'
```

`anon` tiene `SELECT` sobre **todas** las columnas y la policy habilita cualquier viaje
`published`. Es decir: **cualquiera con la anon key puede leer `total_operation_cost`,
`projected_profit` e `internal_notes` de todos los viajes publicados.**

Acá `anon` **sí** es un rol propio, así que el `GRANT` por columnas funciona. Se corrige en
la **Fase 0**.

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
@.claude/skills/supabase                           ← Fases 0-5
@.claude/skills/supabase-postgres-best-practices   ← Fases 0-3, 5
@.claude/skills/vue @.claude/skills/nuxt
@.claude/skills/nuxt-ui @.claude/skills/pinia      ← Fase 4 (UI)
```

---

## Índice de documentos por fase

| Documento | Contenido | Dependencia | Estado |
|---|---|---|---|
| [fase0-hardening-columnas.md](plan/coordinator-access-fase0-hardening-columnas.md) | 🔴 Cerrar la exposición de columnas financieras a `anon` en `travels` | Ninguna | Pendiente |
| [fase1-identidad.md](plan/coordinator-access-fase1-identidad.md) | Schema `private`, `coordinators.user_id`, helpers `is_travel_coordinator` / `can_coordinator_edit` | Ninguna | Pendiente |
| [fase2-rls-lectura.md](plan/coordinator-access-fase2-rls-lectura.md) | Vista `coordinator_travels` + policies `SELECT` aditivas | Fase 1 | Pendiente |
| [fase3-rls-escritura.md](plan/coordinator-access-fase3-rls-escritura.md) | Policies `INSERT`/`UPDATE`/`DELETE` + policy de Storage | Fase 2 | Pendiente |
| [fase4-invitacion.md](plan/coordinator-access-fase4-invitacion.md) | Edge Function `invite-coordinator` + UI de invitación en la web admin | Fase 1 | Pendiente |
| [fase5-verificacion.md](plan/coordinator-access-fase5-verificacion.md) | Matriz de aislamiento end-to-end + advisors | Todas | Pendiente |

> Al terminar cada fase, actualizar su "Estado" acá y en el propio documento de la fase
> (`Pendiente` → `Completada ✅`), para poder retomar en cualquier sesión sin perder
> contexto. Misma convención que la feature de código de acceso.

**Fases 0 y 1 son independientes** y pueden hacerse en cualquier orden. La 4 solo depende
de la 1, así que puede ir en paralelo con 2-3.

---

## Estructura objetivo (global)

```
supabase/
├── migrations/
│   ├── <ts>_travels_anon_column_grants.sql        ← Fase 0
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
| `travels` (tabla) | RW completo | ❌ sin acceso | SELECT columnas públicas (post-Fase 0) |
| `coordinator_travels` (vista) | — | SELECT (sin columnas financieras) | ❌ |
| `travel_activities` | RW | R siempre · W si `published`/`in_progress` | SELECT si `published` |
| `travelers` | RW | R siempre · W si `published`/`in_progress` | ❌ |
| `travel_media` + bucket | RW | R siempre · W si `published`/`in_progress` | SELECT si `published` |
| `travel_services`, `travel_accommodations`, `travel_buses` | RW | R (solo lectura) | parcial |
| `quotations`, `payments`, `*_payments` | RW | ❌ **sin acceso** | ❌ |
| `coordinators`, `providers`, `buses`, `hotel_rooms` | RW | ❌ sin acceso | ❌ |

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
