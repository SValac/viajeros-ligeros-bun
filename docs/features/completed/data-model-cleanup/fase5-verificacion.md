# Fase 5 — Verificación y despliegue

**Estado:** ✅ Completa
**Dependencia:** Todas (✅ completas)

---

## Objetivo

Confirmar que no se perdieron datos, que no hay regresiones, y desplegar a producción.

> Aprendizaje de la feature de código de acceso: su Fase 6 quedó pendiente porque se mergeó
> antes de correrla, y todo se había probado solo contra local. **Verificar antes de
> mergear, no después.**

---

## ⚠️ Antes de tocar remoto

Esta feature aplica `DROP COLUMN`, que normalmente no se deshace con un rollback de
migración sobre datos reales. **No aplicó en este despliegue**: el proyecto remoto
(`mkosbzhagjbyfvizafta`) no tenía datos — recién estaba siendo reactivado desde estado
`INACTIVE` (pausado por inactividad). Confirmado con el usuario antes de saltarse estos
pasos.

- [x] ~~Backup del proyecto remoto~~ — no aplica, sin datos que perder
- [x] ~~Exports de las Fases 2 y 3~~ — no aplica, sin datos que perder
- [x] ~~Queries de control de la Fase 3 contra remoto~~ — no aplica, sin datos que perder

---

## Integridad de datos

No aplica — sin datos preexistentes en remoto al momento del despliegue. Si en el futuro se
repite este tipo de migración contra una base con datos reales, retomar este checklist tal
cual está escrito.

---

## Regresiones en la web admin

Ya cubierto de forma acumulativa durante la verificación de cada fase (ver los docs
`fase{1..4}-*.md`):

- [x] Detalle de viaje: buses, coordinadores
- [x] Costo de operación, margen y notas internas se ven y se editan (Fase 1)
- [x] Crear un viaje nuevo, con internos
- [x] Editar campos operativos → no crea fila vacía en `travel_internals` (garantizado por
      código, `haveInternalFields`)
- [x] Borrar un viaje → cascade limpio
- [x] Catálogo de autobuses de un proveedor: listar, crear, editar (Fase 2)
- [x] Flujo de cotización: agregar bus, cambiar costo (Fase 3-4)
- [x] Sección de autobuses del viaje: operadores (Fase 3-4)
- [~] Cambiar capacidad/unidad/proveedor de un bus → **no aplica**, la UI no permite
      editar esos campos hoy (Fase 4)

**Decisión del usuario:** saltear el resto (listado de viajes, itinerario/servicios/
alojamientos/galería, confirmar cotización, pagos, código de acceso al viaje) — ninguna
de esas áreas fue tocada por esta feature, riesgo bajo.

---

## Aislamiento

- [x] Como `anon`: `SELECT * FROM travels` → no aparecen costo, margen ni notas (local,
      confirmado en Fase 1)
- [x] Como `anon`: `SELECT * FROM travel_internals` → `permission denied` (local,
      confirmado en Fase 1 y re-verificado acá)
- [x] Como `anon`: `SELECT * FROM travel_buses` → sin columnas de costo (verificado)
- [~] Como admin B: no ve nada de la agencia A — no re-testeado con un segundo usuario;
      `travel_internals_owner` sigue el mismo patrón `owner_id = auth.uid()` que el resto
      de las tablas, ya probado en la feature de multi-tenancy
- [x] Como admin A: ve sus internos completos (confirmado en Fase 1)

---

## Calidad y advisors

- [x] `bun run typecheck` limpio
- [x] `bun run lint` limpio
- [x] `grep -rn "rentalPrice\|rental_price" app/` → sin resultados
- [x] `grep -rn "TravelBusForm\|TravelBusList" app/` → sin resultados
- [x] `supabase db advisors --local` → 25 hallazgos, todos `auth_rls_initplan`
      preexistentes (mismas tablas desde antes de esta feature), ninguno nuevo
- [x] Advisors contra **remoto** después del push → 32 hallazgos: los mismos 25
      `auth_rls_initplan` preexistentes + 4 hallazgos de funciones `security_definer` y 1 de
      protección de contraseñas filtradas, todos preexistentes y fuera de alcance de esta
      feature. `travel_internals` no aparece en ninguno de los dos.
- [x] `travel_internals` tiene RLS habilitado **y** grants explícitos (verificado:
      `relrowsecurity = true`, `anon` sin SELECT/INSERT/UPDATE/DELETE, `authenticated` con
      CRUD completo)

---

## Despliegue

```bash
bun run db:push
supabase migration list        # Local y Remote deben coincidir
```

- [x] Migraciones aplicadas a remoto (las 4 de esta feature, sin errores)
- [x] `supabase migration list` coincide — local y remoto idénticos
- [x] Recorrido de regresiones contra producción — no aplicó, remoto sin datos ni usuarios
      todavía; el proyecto recién se reactivó desde `INACTIVE` para este despliegue
- [x] Advisors remotos limpios (ver arriba)

---

## Al cerrar

- [x] Actualizar el estado de todas las fases en
      [PLAN.md](PLAN.md)
- [x] Mover el plan a `docs/features/completed/`
- [ ] **Actualizar `pending/coordinator-access/PLAN.md`:** eliminar su Fase 0 y reescribir su Fase 2
      sin vistas (ver la sección "Efecto sobre el plan de coordinadores" en
      [PLAN.md](PLAN.md)). **Pendiente** — ese plan
      vive en la rama `feature/cordinator-travel-access`, sin mergear, no en esta. Retomar
      cuando se vuelva a esa rama.
- [x] Documentar la convención para el futuro: **toda columna nueva de costo, margen o nota
      interna va a `travel_internals`, nunca a `travels`.** Agregado en
      `docs/architecture/10-technical-notes.md`, sección Seguridad.
