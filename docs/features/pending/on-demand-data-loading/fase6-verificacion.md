# Fase 6 — Verificación con volumen y cierre

**Estado:** Pendiente
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
