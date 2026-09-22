# Fase 5 — Verificación end-to-end

**Estado:** 🚧 Matriz local completa · migraciones + Edge Function ya en remoto · advisors
remotos limpios · **falta el checklist manual end-to-end en remoto** (ver sección al final)
**Dependencia:** Todas

---

## Objetivo

Probar el **aislamiento** de forma sistemática, no por muestreo. Cada fase trae su propio
checklist; esta fase corre la matriz completa contra el proyecto **remoto**, que es donde
va a vivir la app móvil.

> Aprendizaje directo de la feature de código de acceso: su Fase 6 quedó pendiente porque
> se mergeó antes de correrla, y todo se había probado solo contra Supabase local. **No
> repetir ese orden.**

---

## Escenario de prueba

Montar esto una vez y reusarlo. Dos agencias son imprescindibles: la mitad de los bugs de
aislamiento solo aparecen con un segundo tenant.

| Actor | Descripción |
|---|---|
| **Admin A** | Dueño de la agencia A |
| **Admin B** | Dueño de la agencia B (control de cross-tenant) |
| **Coord 1** | Coordinador de A, asignado a Viaje A1 y A2 |
| **Coord 2** | Coordinador de A, asignado **solo** a A2 |
| **Viaje A1** | Agencia A, `published`, con actividades, viajeros, buses, fotos, cotización y pagos |
| **Viaje A2** | Agencia A, `in_progress` |
| **Viaje A3** | Agencia A, `completed`, Coord 1 asignado |
| **Viaje A4** | Agencia A, `pending`, Coord 1 asignado |
| **Viaje B1** | Agencia B, `published`, Coord 1 **no** asignado |

Coord 2 existe para verificar algo que un solo coordinador no puede probar: que dos
coordinadores de **la misma agencia** están aislados entre sí a nivel viaje.

### Fixtures usados en la corrida local (2026-09-22)

Se reusaron identidades existentes en vez de crear todo desde cero:

- **Admin A** = `dev@viajeros-ligeros.local` (seed).
- **Admin B** = `isaac@gmail.com` — ya existía como coordinador de prueba sin ownership
  (Fase 2/3); se le creó un viaje propio (`ff...005`, `published`) para que también sirviera
  como dueño de agencia B. No hizo falta una tercera identidad.
- **Coord 1** = coordinador `Rodrigo Pérez` (`bb...002`), vinculado a un usuario nuevo
  `coord1-test@example.com` (signup + auto-confirm local), asignado a A1 (`ff...002`,
  published, ya existía), A2 (`ff...004`, in_progress, **nuevo**), A3 (`fc...001`,
  completed, ya existía de Fase 3) y A4 (`ff...001`, pending, ya existía).
- **Coord 2** = coordinador nuevo `Coord2 Fixture` (`bb...004`), vinculado a
  `coord2-test@example.com`, asignado **solo** a A2.
- Todo esto se armó con `INSERT`/`UPDATE` directos como `postgres` dentro de una
  transacción (mismo patrón que la Fase 3) — se pierde con `db:reset`.

---

## Matriz de aislamiento

Como **Coord 1**:

### Lectura — debe VER

- [x] `SELECT * FROM travels` → exactamente A1, A2, A3, A4 (no B1)
- [x] Actividades, viajeros, fotos de A1 (probado); A2 quedó sin datos propios en el
      fixture (viaje nuevo vacío) — no hay filas que verificar ahí, cubierto por
      construcción (misma policy `is_travel_coordinator(travel_id)` que ya se probó en A1)
- [x] Datos del viaje A3 (`completed`) — el historial no se pierde (`travels` visible;
      el resto de sus tablas ya se había verificado en la Fase 3 con este mismo fixture)
- [x] `SELECT * FROM travel_buses` → probado contra A4 en vez de A1 (A1 no tiene buses en
      el seed); devuelve el bus con `operator1_name`/`operator1_phone` visibles

### Lectura — NO debe ver

- [x] Ninguna fila de B1 en `travels` (probado directo); el resto de tablas usa el mismo
      predicado `is_travel_coordinator(travel_id)` y B1 no tiene filas propias en el
      fixture, así que no aplica probarlas una por una
- [x] `SELECT * FROM travel_internals` → 0 filas
- [x] `quotations`, `quotation_buses`, `quotation_accommodations`,
      `quotation_accommodation_details`, `quotation_providers`,
      `quotation_public_prices` → 0 filas
- [x] `payments`, `provider_payments`, `bus_payments`, `accommodation_payments` → 0 filas
- [x] `buses`, `hotel_rooms`, `hotel_room_types` → 0 filas
- [x] `travel_access_codes` → 0 filas; `travel_access_attempts` → `42501 permission denied`
      (ni siquiera hay `GRANT` a `authenticated`, fail-closed más fuerte que RLS)
- [x] `coordinators` → Coord 1 ve solo a Sofía, Rodrigo (él mismo) y Coord2 — sus
      compañeros de coordinación en A1/A2/A3/A4 — nada de `Liberty Galloway` (agencia B)
- [x] Confirmado: `travels`/`travel_buses` sin columnas `cost`/`profit`/`margin`

### Escritura — debe PODER

- [x] `UPDATE` de actividades: reasignar `travel_id` de una actividad de A1 (probado más
      abajo, bloqueado hacia B1 — confirma que el `UPDATE` en sí es alcanzable); INSERT/
      DELETE de actividades no se volvió a probar por separado, ya cubierto en Fase 3
- [x] `UPDATE` de viajeros en A1 (`published`) → 1 fila afectada. A2 quedó sin viajeros en
      el fixture — no probado ahí, mismo predicado que A1
- [ ] `move_or_swap_traveler_seat` en A1 — no re-probado esta sesión (requiere fixture de
      bus+asientos); ya verificado en Fase 3 como `SECURITY INVOKER` que hereda estas
      policies sin necesidad de policy propia
- [x] Subir foto a `travel-gallery/{A1}/...` → `200`. Reemplazar/borrar no se repitió (ya
      confirmado en Fase 3); se limpió el archivo de prueba al terminar

### Escritura — NO debe poder

- [x] Nada sobre A3 (`completed`): `UPDATE travelers` → 0 filas
- [x] Nada sobre A4 (`pending`): `UPDATE travelers` → 0 filas
- [x] Nada sobre B1: `UPDATE ... SET travel_id` hacia B1 bloqueado (ver abajo) y subida a
      `travel-gallery/{B1}/...` → `403` (`new row violates row-level security policy`)
- [x] `DELETE` de viajeros → 0 filas afectadas, incluso en A1 donde sí puede escribir
- [x] `UPDATE travels SET status = ...` → 0 filas afectadas
- [x] `INSERT INTO travels` → `42501` (RLS)
- [x] `UPDATE travel_buses` → 0 filas afectadas. `travel_accommodations`/`travel_services`
      no tienen filas en el seed para probar el bloqueo empíricamente, pero comparten el
      mismo diseño de Fase 3 (sin policy de escritura para coordinador, solo lectura)
- [x] Mover una actividad de A1 a B1 vía `UPDATE ... SET travel_id` → **error explícito**
      `42501 new row violates row-level security policy` (el `WITH CHECK` corta antes de
      aplicar el update, más fuerte que un no-op silencioso)
- [x] Subir a `travel-gallery/{B1}/...` → `403`
- [x] Escribir en tabla financiera: `INSERT INTO payments` → `42501` (RLS)

### Aislamiento entre coordinadores de la misma agencia

Como **Coord 2** (solo asignado a A2):

- [x] `SELECT * FROM travels` → solo A2 (1 fila)
- [x] Ninguna fila de A1, pese a ser de la misma agencia
- [x] No puede escribir en A1: `UPDATE travelers` → 0 filas afectadas

### Sin regresiones

- [x] **Admin A**: `travels` sigue devolviendo todos sus viajes vía API; uso normal de la
      web durante la sesión sin errores
- [x] **Admin B** (`isaac`): 0 filas de `travels` de la agencia A
- [x] **Anon**: solo ve los 2 viajes `published` (A1 y B1), nada de `pending`/
      `in_progress`/`completed` — sin cambios respecto de antes
- [ ] **Viajero vía `redeem_travel_access`**: no re-probado esta sesión — es la feature de
      código de acceso, sin overlap de policies con lo que tocó esta feature (no se editó
      ninguna policy `_anon_*` ni la RPC `redeem_travel_access`)

---

## Advisors y revisión final

- [x] `supabase db lint --local` sin hallazgos nuevos (el único warning es preexistente,
      en `generate_travel_access_code`, de la feature de código de acceso)
- [x] Advisors contra **remoto** después del `db:push` (`supabase db lint --linked`) —
      mismo resultado que local, solo el warning preexistente
- [x] Confirmado que `private` **no** está en `schemas` de `config.toml`
      (`schemas = ["public", "graphql_public"]`)
- [x] Confirmado que `travel_internals` **no** recibió ninguna policy para coordinadores
      (única policy: `travel_internals_owner`)
- [x] `is_travel_coordinator` → 404
- [x] `can_coordinator_edit` → 404
- [x] Ninguna policy usa `user_metadata` / `raw_user_meta_data` (grep sobre `pg_policies`)
- [x] `is_travel_coordinator` y `can_coordinator_edit` tienen `search_path=""` en
      `pg_proc.proconfig`
- [x] Los helpers usan `(SELECT auth.uid())` internamente (confirmado en el código de la
      migración de Fase 1); las únicas policies con `auth.uid()` sin envolver que matchean
      "coordinator" en el nombre de tabla son `coordinators_owner` y
      `travel_coordinators_owner`, que son policies **preexistentes** del admin
      (`multitenant_owner_rls`, previas a esta feature) — no hay policies nuevas de esta
      feature sin envolver

---

## Verificación remota

**Hecho (2026-09-22):**

```bash
bun run db:push                                          # ✅ 3 migraciones aplicadas
supabase functions deploy invite-coordinator --no-verify-jwt   # ✅ desplegada
supabase migration list                                   # ✅ Local y Remote coinciden
supabase db lint --linked                                  # ✅ sin hallazgos nuevos
```

**Pendiente — checklist manual end-to-end en remoto** (decisión: se hace la versión corta,
con un coordinador real en vez de repetir la matriz completa de curl que ya se corrió
local; en remoto no hay Mailpit, las invitaciones mandan correo real):

- [ ] Invitar a un coordinador real propio desde `/coordinators` en producción → llega el
      correo de invitación real
- [ ] El coordinador acepta, setea contraseña, se loguea
- [ ] Logueado, `/travels/dashboard` muestra **solo** sus viajes asignados
- [ ] Revocar su acceso → al refrescar esa sesión, ya no ve nada
- [ ] Admin: la web sigue funcionando sin regresiones (viajes, cotizaciones, pagos, galería)

Este checklist manual queda para una próxima sesión — quien lo retome puede leer esta
sección para saber exactamente qué falta sin tener que releer toda la fase.

---

## Documentación al cerrar

- [ ] Actualizar el estado de todas las fases en
      [coordinator-access-PLAN.md](../coordinator-access-PLAN.md)
- [ ] Mover el plan de `docs/features/pending/` a `docs/features/completed/`
- [ ] Documentar el **contrato para la app móvil**: qué tablas puede consultar, qué puede
      escribir, y la ventana de estados (`published` / `in_progress`). Es el equivalente a
      la sección "Despliegue a producción" de `travel-access-fase2-rpc.md`, que resultó ser
      lo más útil de aquella feature.
- [ ] Documentar la convención que sostiene el aislamiento: **toda columna nueva de costo,
      margen o nota interna va a `travel_internals`, nunca a `travels`.** Es lo que mantiene
      la propiedad fail-safe; sin eso, la próxima columna financiera queda expuesta a los
      coordinadores sin que nadie lo note.
