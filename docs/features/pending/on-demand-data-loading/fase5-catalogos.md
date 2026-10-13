# Fase 5 — Catálogos bajo demanda y adiós al plugin de arranque

**Estado:** Completa en la rama `feature/on-demand-loading-phase-5` (desde `main` 05de48a), verificada
en local; falta el PR
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

---

## Diseño: el store lee la query

Cada catálogo tiene **una sola clave** (`catalogKeys` en `app/queries/catalogs.ts`), así que
su store lee la query directamente y no guarda una copia (la 4b sí copia, porque la
cotización va por viaje). Los getters no cambiaron, ni los ~35 componentes que los usan.

```ts
// antes
const providers = ref<Provider[]>([]);
async function fetchAll() { providers.value = await repository.fetchAll(); }

// después
const catalog = useCatalogState(useProvidersCatalog, providersCatalogQuery);
const providers = catalog.items; // computed sobre los datos de la query
```

`useCatalogState` (en `app/queries/catalogs.ts`) junta lo que los cuatro stores necesitan:
`items`, `isLoaded`, `loadError`, `refetch`, `refresh` (invalidar y esperar tras una
escritura), `ensureFresh` (el catálogo como lo tiene el servidor, para validar antes de
escribir) y `setItems` (meter un registro nuevo a la caché antes del refetch).

- **La petición sale la primera vez que una pantalla usa el store**, no al arrancar. Desde
  ahí la query queda activa mientras vive el store (toda la sesión): las escrituras la
  invalidan y se vuelve a pedir, y al regresar a la pestaña se refresca si pasaron los 5 min
  de `staleTime`.
- **`defineQuery`, no `useQuery`, dentro del store.** `useQuery` usa el componente que estaba
  montándose cuando se creó el store (`getCurrentInstance()` sigue apuntando a él) y se apaga
  cuando ese componente se desmonta: después de navegar, borrar un proveedor ya no volvía a
  pedir la lista. `defineQuery` registra su consumidor con `onScopeDispose`, que dentro del
  store queda atado al scope del store.
- **Las escrituras esperan el refetch** (`await invalidateQueries`), así la acción termina con
  los datos nuevos (por ejemplo, antes de navegar al detalle del proveedor recién creado). Si el
  refetch falla, la escritura no se reporta como fallida: se queda lo que había.
- **Las validaciones que leen el catálogo lo piden fresco** (`ensureFresh`: reusa una petición
  en vuelo y vuelve a pedir si nunca cargó, falló o una escritura lo invalidó): `initRoomData`
  revisa si el hotel ya tiene registro en `hotel_rooms`, `updateTotalRooms` valida contra las
  habitaciones usadas. Si no lo consigue, lanza el error en vez de escribir a ciegas.
- **Un registro nuevo entra a la caché antes del refetch** (`setItems`): el detalle del proveedor
  recién creado lo encuentra aunque el refetch falle, y un `hotel_rooms` recién creado no se
  vuelve a crear.
- **Login y logout siguen recargando la página:** vacía a la vez los stores y la caché de Colada.

## Avance

- [x] 1. `app/queries/catalogs.ts`: `catalogKeys`, una query por catálogo (`staleTime` 5 min) y
  su `defineQuery`
- [x] 2. Los cuatro stores leen su query; fuera `fetchAll`; exponen `isLoaded`, `loadError` y
  `refetch`; las escrituras invalidan su clave. Borrar un proveedor invalida también las
  habitaciones (la base borra en cascada); fuera `deleteProviderRooms`
- [x] 3. Estados de carga: `CatalogLoadState` (spinner → error + Reintentar → contenido) en las
  listas de proveedores por categoría, `/providers`, `/coordinators`, las unidades de una agencia y
  las habitaciones de un hotel. Los 7 detalles de proveedor redirigen a la lista solo cuando el
  catálogo ya cargó
- [x] 4. Borrado `app/plugins/init-stores.client.ts`; comentarios de login/logout al día
- [x] 5. Revisión de código (`/code-review`): `useCatalogState` para no repetir el cableado en
  los cuatro stores y `useProviderDetail` para los 7 detalles; `ensureFresh` en lugar de un
  `fetch` que cancelaba la petición en vuelo; Reintentar vuelve a mostrar el spinner; borrar un
  proveedor solo invalida habitaciones si era hotel; el selector de proveedor de la cotización
  toma la categoría cuando llega el catálogo (antes solo al montar, y quedaba vacío); el modal
  de tipo de habitación no se cierra si falla el guardado; un hotel nuevo cuyo total de
  habitaciones falla abre su detalle con un aviso

## Hallazgos

- **El alta de habitaciones podía duplicar `hotel_rooms`.** `hotel-rooms-manager` creaba el
  registro al montar si `hasRoomData` daba `false`, y antes eso pasaba también cuando el
  catálogo aún no llegaba del arranque. `hotel_rooms` no tiene índice único por proveedor. En la
  base local hay un duplicado vacío (0 habitaciones, 2026-10-08) del hotel
  `aa200000-…-0003` del seed. Ahora `initRoomData` espera el catálogo. Pendiente: revisar si
  prod tiene duplicados, y si conviene un índice único (migración expand/contract).
- **`hotel-rooms-manager` no esperaba sus escrituras:** `updateTotalRooms` nunca mostraba el
  error (comparaba una promesa) y los toasts de éxito salían aunque fallara. Ahora espera cada
  escritura y muestra el error.
- **Los selects de los formularios** (proveedores, coordinadores, unidades) se llenan solos
  cuando llega el catálogo; no llevan estado de carga propio. En `Habitaciones` del viaje y en
  la tabla de proveedores de la cotización, el nombre puede decir "desconocido" un instante
  mientras llegan los proveedores.

## Verificación (2026-10-12, local, playwright-cli, servidor aparte en :3002)

- [x] `/login`: ninguna petición REST. `/calendar`: solo perfil, estados y viajes del mes; al
  elegir un viaje, `coordinators` (el panel muestra a "Sofía Martínez").
- [x] `/providers` → cotización (navegación del cliente): `providers` se pide una vez.
- [x] Recargar sobre `/providers/guides/<id>`: carga el detalle. Id inexistente → `/providers/guides`;
  id de otra categoría → su lista.
- [x] Hotel nuevo sin habitaciones (abierto en frío): se crea **un** registro `hotel_rooms`;
  recargar no crea otro. Cambiar el total, agregar y borrar un tipo de habitación, renombrar el
  hotel: todo se refleja sin recargar.
- [x] Detalle del hotel → navegar a la lista → borrarlo: se piden de nuevo `providers` y
  `hotel_rooms` y la fila desaparece (antes del cambio a `defineQuery` no se volvían a pedir).
- [x] Crear y borrar un coordinador; crear una unidad: la lista y el contador se actualizan.
- [x] `providers` y `coordinators` en 500: "No se pudieron cargar …" + Reintentar, que la
  recupera; nunca un "no hay proveedores" falso.
- [x] `Habitaciones` del viaje de prueba: hotel y tipos de habitación con sus nombres.
- [x] Después de la revisión: alta de hotel desde `/providers/accommodation/new` (un registro
  con 15 habitaciones); `hotel_room_types` en 500 al agregar → error y el modal sigue abierto;
  editar un servicio de la cotización abierta en frío → el selector muestra categoría y proveedor.
- [x] `lint:fix` y `typecheck` limpios. Datos de prueba borrados.
