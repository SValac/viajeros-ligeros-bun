# Fase 3 — Segundo eje de RLS: escritura

**Estado:** Pendiente
**Dependencia:** Fase 2 (las policies `SELECT` son **requisito técnico**, ver abajo)
**Migración:** `supabase migration new coordinator_rls_write`

---

## Objetivo

Permitir que el coordinador **edite itinerario, viajeros y fotos** de sus viajes, solo
mientras el viaje esté en `published` o `in_progress`.

Toda esta fase usa `private.can_coordinator_edit()` (membresía **+** ventana de estado), no
`is_travel_coordinator()`.

---

## ⚠️ Requisito técnico: `UPDATE` necesita policy de `SELECT`

En Postgres, un `UPDATE` primero tiene que **encontrar** la fila, y esa búsqueda pasa por
la policy de `SELECT`. Sin policy `SELECT`, el `UPDATE` **devuelve 0 filas en silencio** —
sin error, sin cambio, sin ninguna pista de qué pasó.

Las policies de la Fase 2 ya cubren esto. Es la razón por la que **la Fase 3 no se puede
hacer antes que la 2**, y es el bug más desconcertante de depurar si se saltea el orden.

---

## Bloque 1: itinerario y fotos (CRUD completo)

```sql
-- travel_activities
CREATE POLICY "travel_activities_coordinator_insert" ON public.travel_activities
  FOR INSERT TO authenticated
  WITH CHECK (private.can_coordinator_edit(travel_id));

CREATE POLICY "travel_activities_coordinator_update" ON public.travel_activities
  FOR UPDATE TO authenticated
  USING (private.can_coordinator_edit(travel_id))
  WITH CHECK (private.can_coordinator_edit(travel_id));

CREATE POLICY "travel_activities_coordinator_delete" ON public.travel_activities
  FOR DELETE TO authenticated
  USING (private.can_coordinator_edit(travel_id));

-- travel_media (mismas tres, idénticas)
CREATE POLICY "travel_media_coordinator_insert" ON public.travel_media
  FOR INSERT TO authenticated
  WITH CHECK (private.can_coordinator_edit(travel_id));

CREATE POLICY "travel_media_coordinator_update" ON public.travel_media
  FOR UPDATE TO authenticated
  USING (private.can_coordinator_edit(travel_id))
  WITH CHECK (private.can_coordinator_edit(travel_id));

CREATE POLICY "travel_media_coordinator_delete" ON public.travel_media
  FOR DELETE TO authenticated
  USING (private.can_coordinator_edit(travel_id));
```

### Por qué `USING` **y** `WITH CHECK` en el `UPDATE`

Son dos controles distintos y hacen falta los dos:

- **`USING`** → evalúa la fila **vieja**: "¿podés tocar esta fila?"
- **`WITH CHECK`** → evalúa la fila **nueva**: "¿el resultado sigue siendo tuyo?"

Sin `WITH CHECK`, un coordinador podría hacer
`UPDATE travel_activities SET travel_id = '<viaje-ajeno>'` y **mover** una actividad al
viaje de otra agencia. Con ambas cláusulas, el `travel_id` nuevo también tiene que pasar
`can_coordinator_edit`, así que la reasignación queda bloqueada.

### Por qué policies separadas por comando y no un `FOR ALL`

Un `FOR ALL ... USING (can_coordinator_edit(...))` funcionaría (se combina con `OR` con la
policy `SELECT` de la Fase 2), pero mezclaría en una sola regla la lectura —que debe estar
siempre disponible— con la escritura —que es acotada por estado—. Separadas, cada policy
dice exactamente una cosa y la auditoría es trivial.

---

## Bloque 2: viajeros (`INSERT` + `UPDATE`, **sin** `DELETE`)

```sql
CREATE POLICY "travelers_coordinator_insert" ON public.travelers
  FOR INSERT TO authenticated
  WITH CHECK (private.can_coordinator_edit(travel_id));

CREATE POLICY "travelers_coordinator_update" ON public.travelers
  FOR UPDATE TO authenticated
  USING (private.can_coordinator_edit(travel_id))
  WITH CHECK (private.can_coordinator_edit(travel_id));
```

**No hay `DELETE` a propósito.** Un viajero tiene pagos asociados (`payments`), es una
relación comercial de la agencia. Un coordinador corrigiendo datos en ruta no debería poder
eliminar el registro de alguien que pagó; si un viajero se da de baja, eso lo maneja el
admin desde la web.

**Decisión pendiente:** ¿el coordinador debe poder **agregar** viajeros desde la app (un
walk-in de último momento), o solo editar los que ya existen? Si es solo editar, borrar
también la policy de `INSERT`. **Lo restrictivo primero es más fácil de aflojar después.**

### El RPC de cambio de asiento funciona solo ✅

`move_or_swap_traveler_seat` (`20260426052101_traveler_seat_swap_rpc.sql`) **no** declara
`SECURITY DEFINER`, así que es `SECURITY INVOKER`: corre con los privilegios del que llama
y respeta RLS. Con las policies de arriba, un coordinador puede cambiar y permutar asientos
de **sus** viajes automáticamente, y sigue sin poder tocar los de otros. No hay que
modificar el RPC.

Vale confirmarlo igual en la verificación — es el tipo de cosa que se asume y falla.

---

## Bloque 3: Storage (bucket `travel-gallery`)

Las fotos son dos permisos, no uno: la fila en `travel_media` (Bloque 1) **y** el objeto
binario en Storage. Sin este bloque, el coordinador crea la fila pero la subida falla.

```sql
CREATE POLICY "gallery_coordinator_all" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'travel-gallery'
    AND private.can_coordinator_edit(((string_to_array(name, '/'))[1])::uuid)
  )
  WITH CHECK (
    bucket_id = 'travel-gallery'
    AND private.can_coordinator_edit(((string_to_array(name, '/'))[1])::uuid)
  );
```

Sigue el mismo patrón que `gallery_owner_all`
(`20260614234026_multitenant_storage_rls.sql`): el path es `{travelId}/{folder}/{filename}`
y `(string_to_array(name,'/'))[1]` extrae el `travelId`.

Diferencia con la policy del owner: ésa compara `id::text` con el segmento; acá se castea
el segmento a `uuid` porque el helper recibe `uuid`. **Si un objeto tuviera un primer
segmento que no es un UUID válido, el cast lanza error en vez de devolver `false`.** Hoy
todos los paths los genera la app con el `travelId`, así que no pasa — pero si aparecen
paths con otro formato, envolver en una subquery con `WHERE name ~ '^[0-9a-f-]{36}/'`.

⚠️ **Upsert de Storage necesita `INSERT` + `SELECT` + `UPDATE`.** Por eso este bloque va
como `FOR ALL` y no solo `INSERT`: con solo `INSERT` las subidas nuevas funcionan pero
reemplazar un archivo falla en silencio.

---

## Gotchas

1. **Lo que esta fase deliberadamente NO permite:**
   - Crear o borrar viajes (`travels` sigue sin ninguna policy para coordinadores)
   - Cambiar el `status` del viaje — publicar o cerrar un viaje es del admin
   - Tocar `travel_services`, `travel_accommodations`, `travel_buses` (lectura sí, Fase 2;
     escritura no: son contratos con proveedores)
   - Cualquier cosa financiera

2. **La ventana de edición se cierra sola.** Cuando el admin pasa el viaje a `completed`,
   `can_coordinator_edit` empieza a devolver `false` y la escritura se corta sin que nadie
   revoque nada. La lectura sigue (Fase 2). Es el comportamiento buscado — vale la pena
   verificarlo explícitamente.

3. **El error que ve la app móvil es un 403 de PostgREST**, no un mensaje de dominio. La
   app debería traducir "viaje no editable" a algo legible, y de paso ocultar los controles
   de edición cuando `status` no está en la ventana (defensa en profundidad: la UI ayuda,
   RLS decide).

---

## Verificación

Con el coordinador de prueba, un viaje A `published` asignado, un viaje B no asignado, y un
viaje C `completed` asignado:

**Debe funcionar (viaje A):**
- [ ] `INSERT` de actividad en A
- [ ] `UPDATE` de actividad de A
- [ ] `DELETE` de actividad de A
- [ ] `UPDATE` de viajero de A (ej. `boarding_point`)
- [ ] `move_or_swap_traveler_seat` sobre viajeros de A
- [ ] Subir foto a `travel-gallery/{A}/...` **y** crear la fila en `travel_media`
- [ ] Reemplazar (upsert) una foto ya existente de A

**Debe fallar:**
- [ ] `UPDATE` de actividad del viaje B → 0 filas
- [ ] `INSERT` de actividad en B → error de policy
- [ ] `UPDATE ... SET travel_id = B` sobre una actividad de A → bloqueado por `WITH CHECK`
- [ ] `DELETE` de viajero de A → 0 filas (no hay policy de delete)
- [ ] Cualquier escritura sobre el viaje C (`completed`) → 0 filas / error
- [ ] `UPDATE travels SET status = 'completed'` → 0 filas
- [ ] `INSERT INTO travels` → error
- [ ] `UPDATE travel_buses` / `travel_accommodations` → 0 filas
- [ ] Subir a `travel-gallery/{B}/...` → error
- [ ] Cualquier escritura sobre `quotations` / `payments` / `*_payments` → error

**Sin regresión:**
- [ ] El admin dueño sigue pudiendo hacer todo lo de siempre desde la web
- [ ] La galería de fotos de la web admin sigue funcionando (subir, borrar, reordenar)

---

## Comandos (los corre el usuario)

```bash
supabase migration new coordinator_rls_write
bun run db:reset
supabase db advisors --local
```
