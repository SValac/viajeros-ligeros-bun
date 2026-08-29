# Fase 5 — Verificación y despliegue

**Estado:** Pendiente
**Dependencia:** Todas

---

## Objetivo

Confirmar que no se perdieron datos, que no hay regresiones, y desplegar a producción.

> Aprendizaje de la feature de código de acceso: su Fase 6 quedó pendiente porque se mergeó
> antes de correrla, y todo se había probado solo contra local. **Verificar antes de
> mergear, no después.**

---

## ⚠️ Antes de tocar remoto

Esta feature aplica `DROP COLUMN` sobre una base **con datos reales**. Un `DROP COLUMN` no
se deshace con un rollback de migración.

- [ ] Backup del proyecto remoto `mkosbzhagjbyfvizafta` (o `pg_dump` de `travels`, `buses`,
      `travel_buses`)
- [ ] Exports de las Fases 2, 3 y 4 guardados fuera del repo
- [ ] Las queries de control de la Fase 3 corridas **contra remoto**, no solo local — los
      datos de producción pueden tener divergencias que local no muestra

---

## Integridad de datos

- [ ] `count(*)` de `travel_internals` == viajes que tenían internos antes
- [ ] Elegir 3 viajes con costo/margen/notas y comparar valor por valor contra el backup
- [ ] Ningún viaje quedó sin sus internos
- [ ] Ningún `travel_buses` quedó huérfano de su `quotation_buses`
- [ ] Los costos de bus siguen correctos en la cotización (la fuente de verdad)

---

## Regresiones en la web admin

Recorrido completo, con un viaje real:

- [ ] Listado de viajes
- [ ] Detalle de viaje: itinerario, servicios, buses, alojamientos, galería, coordinadores
- [ ] **Costo de operación, margen y notas internas se ven y se editan** (Fase 1)
- [ ] Crear un viaje nuevo, con y sin internos
- [ ] Editar solo campos operativos → no crea fila vacía en `travel_internals`
- [ ] Borrar un viaje → cascade limpio
- [ ] Catálogo de autobuses de un proveedor: listar, crear, editar (Fase 2)
- [ ] Flujo de cotización completo: agregar bus, cambiar costo, confirmar, pagos
- [ ] Sección de autobuses del viaje: operadores y asignación de coordinadores (Fase 3)
- [ ] Galería de fotos
- [ ] Código de acceso al viaje: generar, copiar, revocar (feature anterior, no debería
      verse afectada)

---

## Aislamiento

- [ ] Como `anon`: `SELECT * FROM travels` → **no** aparecen costo, margen ni notas
      (las columnas ya no existen)
- [ ] Como `anon`: `SELECT * FROM travel_internals` → `permission denied`
- [ ] Como `anon`: `SELECT * FROM travel_buses` → sin columnas de costo
- [ ] Como admin B: no ve nada de la agencia A (multi-tenant intacto)
- [ ] Como admin A: ve sus internos completos

---

## Calidad y advisors

- [ ] `bun run typecheck` limpio
- [ ] `bun run lint` limpio
- [ ] `grep -rn "rentalPrice\|rental_price" app/` → sin resultados
- [ ] `grep -rn "TravelBusForm\|TravelBusList" app/` → sin resultados
- [ ] `supabase db advisors --local` sin hallazgos nuevos
- [ ] Advisors contra **remoto** después del push
- [ ] `travel_internals` tiene RLS habilitado **y** grants explícitos

---

## Despliegue

```bash
bun run db:push
supabase migration list        # Local y Remote deben coincidir
```

- [ ] Migraciones aplicadas a remoto
- [ ] `supabase migration list` coincide
- [ ] Recorrido de regresiones repetido **contra producción**
- [ ] Advisors remotos limpios

---

## Al cerrar

- [ ] Actualizar el estado de todas las fases en
      [data-model-cleanup-PLAN.md](../data-model-cleanup-PLAN.md)
- [ ] Mover el plan a `docs/features/completed/`
- [ ] **Actualizar [coordinator-access-PLAN.md](../coordinator-access-PLAN.md):** eliminar
      su Fase 0 y reescribir su Fase 2 sin vistas (ver la sección "Efecto sobre el plan de
      coordinadores")
- [ ] Documentar la convención para el futuro: **toda columna nueva de costo, margen o nota
      interna va a `travel_internals`, nunca a `travels`.** Es lo que mantiene la propiedad
      fail-safe que esta feature acaba de conseguir.
