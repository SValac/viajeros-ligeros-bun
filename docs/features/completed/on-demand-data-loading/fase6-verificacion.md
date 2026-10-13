# Fase 6 — Verificación con volumen y cierre

**Estado:** Completa en la rama `feature/on-demand-loading-phase-6` (desde la de la Fase 5),
verificada en local; falta el PR
**Dependencia:** Todas
**Migración:** No

---

## Objetivo

Probar que la app se comporta bien **por encima** del corte de 1000 filas, que el arranque
ya no carga datos de más, y dejar la documentación al día.

---

## 1. Datos de volumen (solo local)

Script SQL de un solo uso (scratchpad, **no** en `seed.sql` ni en migraciones) que sobre la
base local cree, para el usuario dev del seed:

- ~1200 viajes con fechas repartidas en varios años y todos los estados.
- Un viaje con >1000 viajeros y otros con decenas.
- Pagos suficientes para pasar de 1000 en `/payments`.

Usar `generate_series`. **Nunca** contra stage/QA/prod.

## 2. Checklist

- [ ] Arranque en `/calendar`: solo peticiones de auth/perfil + viajes del mes visible.
- [ ] Dashboard: totales por estado correctos con >1000 viajes; paginación recorre todos.
- [ ] Deep link al viaje **más viejo**: carga (antes daba "no encontrado").
- [ ] Viaje con >1000 viajeros: ver nota abajo.
- [ ] Calendario: conteo de viajeros correcto en viajes viejos.
- [ ] `/payments`: totales correctos por página.
- [ ] Dos sesiones (dueño + coordinador): un cambio en una aparece en la otra al volver a
      la pestaña.
- [ ] Logout/login entre usuarios sin datos cruzados.
- [ ] `lint:fix` + `typecheck` limpios; sin warnings en consola.

**Viaje con >1000 viajeros:** `fetchByTravel` de un solo viaje también tendría el corte.
No es realista para la agencia (un viaje no lleva 1000 personas), pero si la prueba lo
muestra, documentar el límite o paginar la lista de viajeros como follow-up.

## 3. Documentación

- `docs/architecture/02-store.md` / `04-data-flow.md`: reemplazar la descripción de
  "carga todo al inicio" por el patrón Colada (si no se hizo en Fase 0).
- Mover `docs/features/pending/on-demand-data-loading/` a `docs/features/completed/`
  **dentro del PR de la última fase** ([[feedback-docs-completed-in-same-pr]]).
- Agregar la entrada a la lista de features completadas en
  `docs/claude/07-documentation.md`.

---

## Resultado (2026-10-12, local, playwright-cli contra un servidor aparte en :3002)

### Datos de volumen

Script de un solo uso (scratchpad, no está en el repo), corrido solo contra la base local. **Los
datos se quedan en la base local** (decisión del usuario), todos con etiqueta `VOL …`:

- 1201 viajes `VOL` (1200 repartidos entre 2022-01 y 2026-12 + `VOL Viaje grande`): 1047
  completados, 117 cancelados, 28 pendientes, 11 publicados, 7 en curso, contando también los del seed.
- 7718 viajeros: 1100 en `VOL Viaje grande`; de 5 a 40 en cada uno de los 300 viajes más viejos.
- 3740 pagos; configuraciones de cuenta (adulto, $1,200) para todos los viajeros `VOL`;
  `VOL Viaje grande` tiene cotización con un precio público de $1,200.

### Checklist

- [x] Arranque en `/calendar`: solo `country_states`, `agency_profiles` y `travels` del mes.
  `/login` (sesión nueva): cero peticiones REST.
- [x] Dashboard: "Total Viajes" 1210, publicados 11, en curso 7 (iguales a SQL). Con todos los
  estados, la última página es `offset=1200` (filas 1201-1210).
- [x] Deep link a `VOL Viaje 0001` (el más viejo, 2022-01-02): carga el detalle.
- [x] Calendario con `?viaje=` de `VOL Viaje 0001`: enero de 2022 y "Viajeros 6" (SQL: 6).
- [x] `/payments`: paginado; los totales de cada viaje salen de `travelPaymentTotalsQuery`.
- [x] Viaje con >1000 viajeros: **se cortaba** y se arregló (ver abajo).
- [x] Dos sesiones: Sofía (coordinadora) con el viaje abierto; el nombre cambiado por SQL
  (como el dueño) aparece al regresar a la pestaña pasado el `staleTime`.
- [x] Logout de dev → login de Sofía: caché de queries vacía, 3 viajes suyos, ningún `VOL`.
  Logout → login de dev otra vez.
- [x] Consola sin warnings (solo el aviso del mapa vectorial de Google en el navegador headless).
- [x] `lint:fix` + `typecheck` limpios.

**Viaje con >1000 viajeros.** El panel de pagos de `VOL Viaje grande` mostraba 1000 viajeros,
$1,200,000 esperado y $950,000 cobrado (SQL: 1100, $1,320,000 y $1,045,000): `fetchByTravel` de
viajeros no iba en tandas, a diferencia de pagos y configuraciones. Ahora viajeros y asignaciones de
habitación del viaje usan `fetchInBatches` (dos peticiones, `offset=0` y `offset=1000`) y el panel
muestra los 1100 y los totales de SQL.

### Pendientes de la Fase 4

- [x] Borrar habitaciones vacías (`_deleteRooms`): quitar de la cotización el tipo "Suite junior"
  (10 habitaciones sin viajeros) borra sus 10 `travel_accommodations` y vuelve a pedir el detalle
  del viaje; la pestaña Habitaciones pasa de 20 a 10. Restaurado después (las 10 habitaciones,
  costo del hotel otra vez $23,500).
- [x] "Precio por asiento sin recalcular": con el PATCH de `quotations` en 500, agregar y quitar a
  Rodrigo Pérez como coordinador guarda el viaje y muestra el aviso. Quedó como estaba (solo
  Sofía, precio por asiento 3015).
- [x] Tarjeta del código de acceso en un viaje publicado: muestra "Generar código"; generar da un
  código de 6 caracteres que expira al terminar el viaje. Código de prueba borrado.

## Documentación

- [x] `docs/architecture/02-store.md`, `04-data-flow.md`, `08-file-structure.md`,
  `10-technical-notes.md`: fuera "carga todo al inicio" y el plugin; patrón Colada, catálogos y
  tandas de 1000.
- [x] Carpeta movida a `docs/features/completed/` en este PR.
- [x] Entrada en `docs/claude/07-documentation.md`.

