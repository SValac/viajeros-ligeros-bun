# Fase 5 — Verificación end-to-end

**Estado:** Pendiente
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

---

## Matriz de aislamiento

Como **Coord 1**:

### Lectura — debe VER

- [ ] `SELECT * FROM travels` → exactamente A1, A2, A3, A4 (no B1)
- [ ] Actividades, viajeros, fotos, alojamientos, servicios de A1 y A2
- [ ] Datos del viaje A3 (`completed`) — el historial no se pierde
- [ ] `SELECT * FROM travel_buses` de A1 → con datos de operadores

### Lectura — NO debe ver

- [ ] Ninguna fila de B1, en **ninguna** tabla
- [ ] `SELECT * FROM travel_internals` → 0 filas (costos y márgenes)
- [ ] `quotations`, `quotation_buses`, `quotation_accommodations`,
      `quotation_accommodation_details`, `quotation_providers`,
      `quotation_public_prices` → 0 filas
- [ ] `payments`, `provider_payments`, `bus_payments`, `accommodation_payments` → 0 filas
- [ ] `buses`, `hotel_rooms`, `hotel_room_types` → 0 filas
- [ ] `travel_access_codes`, `travel_access_attempts` → 0 filas
- [ ] `coordinators` → solo compañeros de sus viajes (o 0 filas, según la decisión 2a de
      la Fase 2)
- [ ] Confirmar que `travels` y `travel_buses` ya **no tienen** columnas financieras —
      si las tuvieran, el saneamiento no se aplicó y estas policies están filtrando datos

### Escritura — debe PODER

- [ ] CRUD de actividades en A1 (`published`) y A2 (`in_progress`)
- [ ] `UPDATE` de viajeros en A1 y A2
- [ ] `move_or_swap_traveler_seat` en A1
- [ ] Subir, reemplazar y borrar fotos de A1

### Escritura — NO debe poder

- [ ] Nada sobre A3 (`completed`) ni A4 (`pending`)
- [ ] Nada sobre B1
- [ ] `DELETE` de viajeros (en ningún viaje)
- [ ] `UPDATE travels SET status = ...`
- [ ] `INSERT INTO travels`
- [ ] `UPDATE travel_buses` / `travel_accommodations` / `travel_services`
- [ ] Mover una actividad de A1 a B1 vía `UPDATE ... SET travel_id`
- [ ] Subir a `travel-gallery/{B1}/...`
- [ ] Escribir en cualquier tabla financiera

### Aislamiento entre coordinadores de la misma agencia

Como **Coord 2** (solo asignado a A2):

- [ ] `SELECT * FROM travels` → solo A2
- [ ] Ninguna fila de A1, pese a ser de la misma agencia
- [ ] No puede escribir en A1

### Sin regresiones

- [ ] **Admin A**: la web funciona completa — viajes, cotizaciones, pagos, galería,
      código de acceso, viajeros, alojamientos
- [ ] **Admin B**: no ve nada de la agencia A (el multi-tenant sigue intacto)
- [ ] **Anon**: sigue viendo solo viajes `published`, sin cambios respecto de antes
- [ ] **Viajero vía `redeem_travel_access`**: la feature de código de acceso sigue igual

---

## Advisors y revisión final

- [ ] `supabase db advisors --local` sin hallazgos nuevos
- [ ] Advisors contra **remoto** después del `db:push`
- [ ] Confirmar que `private` **no** está en `schemas` de `config.toml`
- [ ] Confirmar que `travel_internals` **no** recibió ninguna policy para coordinadores
- [ ] `curl "$SUPABASE_URL/rest/v1/rpc/is_travel_coordinator"` → 404
- [ ] `curl "$SUPABASE_URL/rest/v1/rpc/can_coordinator_edit"` → 404
- [ ] Ninguna policy nueva usa `user_metadata` / `raw_user_meta_data`
- [ ] Toda función `SECURITY DEFINER` nueva tiene `SET search_path = ''`
- [ ] Toda policy nueva envuelve `auth.uid()` en `(SELECT auth.uid())`

---

## Verificación remota

```bash
# 1. Aplicar migraciones a remoto (lo corre el usuario)
bun run db:push
supabase migration list          # Local y Remote deben coincidir

# 2. Repetir la matriz contra remoto con curl / la app móvil
```

La matriz completa hay que correrla **contra remoto**, no solo local. Diferencias reales
que aparecen ahí: las políticas de Storage se comportan distinto con el bucket real, y los
advisors remotos evalúan cosas que el local no.

Un JWT de coordinador para los `curl` se obtiene con:

```bash
curl -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"coord1@...","password":"..."}'
```

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
