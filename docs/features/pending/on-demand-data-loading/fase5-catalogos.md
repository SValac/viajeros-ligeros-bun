# Fase 5 — Catálogos bajo demanda y adiós al plugin de arranque

**Estado:** Pendiente
**Dependencia:** Fases 2-4 (el plugin ya solo carga catálogos)
**Migración:** No

---

## Objetivo

Proveedores, coordinadores, autobuses (unidades) y tipos de habitación siguen cargándose
**completos** — son pocos y se usan en selects por toda la app — pero **la primera vez que
una pantalla los necesita**, no al arrancar. Al final se borra
`app/plugins/init-stores.client.ts`.

---

## Situación actual

| Store | Usado en |
|---|---|
| `use-provider-store` | ~27 archivos (páginas de proveedores, viajeros, habitaciones, editores de cotización) |
| `use-coordinator-store` | `/coordinators`, dashboard, detalle de viaje, y ~4 componentes |
| `use-bus-store` | 2 archivos |
| `use-hotel-room-store` | ~7 archivos (habitaciones, alta de alojamiento) |

---

## Pasos

1. `app/queries/catalogs.ts`: una query por catálogo (`['catalog', 'providers']`, …) con
   `staleTime` largo (ej. 5-10 min) — cambian poco y casi siempre los cambia el mismo
   usuario, cuyas mutaciones invalidan.
2. Getters que hoy filtran el arreglo (proveedores por tipo, etc.) pasan a `computed` sobre
   `data` de la query, o se mantienen en un composable `useProviders()` para no repetir.
3. Mutaciones de catálogos invalidan su clave.
4. Borrar `init-stores.client.ts`.
5. **Login / logout**: hoy `login.vue:43` y `user-menu.vue` hacen recarga completa porque el
   plugin solo corre al arrancar ([[bugfix-login-stale-stores]]). Con Colada basta limpiar
   el caché de queries al cambiar de usuario. Decidir si se cambia la recarga por
   `queryCache.clear()` + `router.push`, o se deja la recarga (más simple, igual de
   correcta). Si se cambia, verificar que **no quede ningún dato del usuario anterior**.

---

## Verificación

- Abrir la app en `/calendar`: no se pide ningún catálogo (pestaña Red).
- Entrar a `/providers` y luego a una cotización: proveedores se piden una vez.
- Crear proveedor/coordinador/unidad: aparece en los selects sin recargar.
- Logout → login con otro usuario (dev seed + uno de prueba): cero datos del anterior.
