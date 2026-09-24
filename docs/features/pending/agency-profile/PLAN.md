# Feature: Perfil de Agencia (datos públicos del usuario dueño de viajes)

**Objetivo:** Que cada usuario registrado (el dueño de una agencia, el `owner_id` de sus
viajes) tenga un **perfil editable** con los datos de su agencia —empresa, país, estado,
logo, colores y teléfono— y que la **web pública** los reciba junto con cada viaje
publicado, para poder mostrar quién lo organiza y **filtrar viajes por ubicación de la
agencia**.

**Complejidad:** Media — 3 migraciones (catálogo de ubicaciones, tabla de perfil, bucket de
logos), 1 migración opcional (gate de publicación), módulo nuevo en el CRM (types +
repository + domain + store + página) y un cambio de contrato en la web.

**Estado:** 🚧 EN PROGRESO — rama `feature/agency-profile`. Fase 1 completa en local.

---

## Contexto

La web pública (`viajeros-ligeros-web/app/lib/trips-supabase.ts`) consulta `travels` como
`anon` con `.eq('status', 'published')` y **sin filtrar por `owner_id`**. La policy
`travels_anon_confirmed` (`20260506230433_rls_single_admin_policies.sql:13`) solo mira el
estado. Resultado: la web muestra los viajes publicados de **todos** los usuarios
registrados, que es el comportamiento correcto y buscado (confirmado con el usuario,
2026-09-23).

Lo que falta es **de quién es cada viaje**. Hoy un viaje no lleva ningún dato de su
agencia: `owner_id` apunta a `auth.users`, que no está expuesto en la API y no guarda nada
comercial. La web no puede decir "organiza Viajes X, Guadalajara" ni filtrar por estado.

Además, la web **filtra en el cliente** (`app/composables/use-trips.ts`): trae todos los
viajes publicados de una vez y filtra en memoria por búsqueda, precio y fechas. Por eso lo
natural es que los datos de la agencia lleguen **incrustados en la misma consulta** de
viajes (embed de PostgREST), no en una segunda llamada.

### Decisiones ya confirmadas con el usuario

1. **Todos los campos del perfil son públicos.** Es la tarjeta comercial de la agencia. El
   correo de login **no** se guarda en el perfil, así que nunca se expone.
2. **País y estado salen de un catálogo con códigos**, no texto libre, para que los
   filtros no se ensucien con variantes ("Mexico"/"México"). **De momento solo México**
   (32 entidades federativas); el catálogo queda listo para agregar países después.
3. **Los colores son solo branding para la web** (tarjetas, badges de sus viajes). **No**
   cambian el tema del CRM, que sigue usando la paleta con nombres de Nuxt UI.
4. **Perfil completo para publicar:** un viaje no puede pasar a `published` si la agencia no
   tiene nombre de empresa y estado (Fase 5, confirmada 2026-09-23).
5. **Modo mentor:** el usuario escribe el código; el asistente guía y revisa con los skills
   de buenas prácticas.

---

## Contexto de diseño

### Por qué `agency_profiles` y no `profiles`

Desde [coordinator-access](../../completed/coordinator-access/fase1-identidad.md), **los
coordinadores también son usuarios de Supabase Auth**. Una tabla `profiles` genérica,
"una fila por usuario", mezclaría dos cosas distintas: la agencia (dueña de viajes) y su
personal. El nombre `agency_profiles` deja explícito que la fila describe **a quien es
dueño de viajes** y que un coordinador no tiene una.

Consecuencia directa: el trigger que crea el perfil al registrarse **debe saltarse a los
coordinadores invitados**. `invite-coordinator` llama a `inviteUserByEmail` con
`data: { coordinator_id }`, que queda en `raw_user_meta_data` **en el mismo INSERT** en
`auth.users`. El `app_metadata.role = 'coordinator'` se setea en un paso posterior, así que
**no** sirve para esta decisión (todavía no existe cuando dispara el trigger).

### Por qué la fila se crea por trigger (y se hace backfill)

Para que la web pueda escribir `travels → agency_profiles(...)` en el `select`, PostgREST
necesita un **FK** entre ambas tablas. La opción limpia es un segundo FK sobre la misma
columna: `travels.owner_id → agency_profiles.id` (el FK existente a `auth.users` queda
igual). Ese FK exige que **todo dueño de un viaje tenga perfil**, lo que se garantiza así:

- **Trigger `AFTER INSERT ON auth.users`** que crea la fila vacía para cada usuario nuevo
  (excepto coordinadores).
- **Backfill** en la misma migración para los usuarios que ya existen, **antes** de crear
  el FK.

Se descartó crear el perfil de forma diferida ("upsert al guardar por primera vez"):
dejaría viajes sin perfil y obligaría a quitar el FK, y con él el embed.

### Por qué la policy `anon` se limita a agencias con viajes publicados

`anon` solo necesita ver el perfil de quien **tiene algo publicado**. Una agencia recién
registrada, que todavía no publica nada, no tiene por qué ser enumerable desde la API
pública. La policy es un `EXISTS` sobre `travels` con `status = 'published'` que se
evalúa con el propio RLS de `anon` sobre `travels`, sin reglas adicionales.

### Aviso fail-open: toda columna de `agency_profiles` es pública

RLS filtra **filas, no columnas** (es la lección de
[data-model-cleanup](../../completed/data-model-cleanup/PLAN.md)). Si en el futuro hace
falta un dato **privado** de la agencia (RFC, datos de facturación, notas internas),
**no va en esta tabla**: va en una tabla satélite con policy solo de dueño, igual que
`travel_internals`. Esto queda como comentario en la propia migración.

---

## Modelo de datos

### Catálogo de ubicaciones

| Tabla | Columnas | Notas |
|---|---|---|
| `countries` | `code text PK` (ISO 3166-1, `CHECK ^[A-Z]{2}$`), `name text` | Semilla: `MX` |
| `country_states` | `country_code text FK`, `code text`, `name text`, PK `(country_code, code)` | Semilla: 32 entidades de MX (ISO 3166-2, ej. `JAL`, `CMX`) |

Los datos de referencia van **en la migración, no en `seed.sql`**: `seed.sql` solo corre en
local, así que stage y prod quedarían con el catálogo vacío.

### `agency_profiles`

| Columna | Tipo | Regla |
|---|---|---|
| `id` | `uuid PK` | FK → `auth.users(id) ON DELETE CASCADE` |
| `company_name` | `text` | nullable (vacía al registrarse); obligatoria para "perfil completo" |
| `country_code` | `text` | `NOT NULL DEFAULT 'MX'`, FK → `countries` |
| `state_code` | `text` | nullable; FK compuesto `(country_code, state_code)` → `country_states` |
| `phone` | `text` | nullable; formato E.164 (`^\+[1-9][0-9]{7,14}$`), sirve para enlaces de WhatsApp |
| `logo_url` | `text` | nullable; URL pública del bucket `agency-logos` |
| `primary_color` | `text` | nullable; `^#[0-9A-Fa-f]{6}$` |
| `secondary_color` | `text` | nullable; `^#[0-9A-Fa-f]{6}$` |
| `created_at` / `updated_at` | `timestamptz` | `updated_at` con `extensions.moddatetime`, como el resto del esquema |

**Perfil completo** = `company_name` y `state_code` no nulos. Es la condición mínima para que
un viaje sea filtrable en la web (ver Fase 5).

---

## Rol del asistente

**Modo:** Mentor / Guía de implementación (confirmado). En cada fase el asistente explica
el *por qué* y el *cómo* antes de que el usuario escriba código, **no implementa los
archivos**, y revisa lo escrito contra los skills de buenas prácticas antes de avanzar.

**Comandos:** los corre siempre el usuario (`db:reset`, `db:types`, `typecheck`,
`lint:fix`, advisors, pruebas manuales) y comparte el resultado para revisión. Incluye todo
lo que toca Supabase remoto (`db:push:stage`, `db:push:prod`). Orden: **stage → verificar →
prod**.

**Skills a cargar según la fase:**

```
supabase + supabase-postgres-best-practices   ← Fases 1-3, 5, 7
vue + nuxt + nuxt-ui + pinia                   ← Fase 4
```

---

## Índice de documentos por fase

| Documento | Contenido | Dependencia | Estado |
|---|---|---|---|
| [fase1-catalogo-ubicaciones.md](fase1-catalogo-ubicaciones.md) | `countries` + `country_states` con semilla MX | Ninguna | ✅ Completa (local) |
| [fase2-tabla-perfil.md](fase2-tabla-perfil.md) | `agency_profiles`, trigger de alta, backfill, RLS, FK desde `travels`, índice `owner_id` | Fase 1 | Pendiente |
| [fase3-bucket-logos.md](fase3-bucket-logos.md) | Bucket `agency-logos` + policies de Storage por carpeta de usuario | Fase 2 | Pendiente |
| [fase4-crm-perfil.md](fase4-crm-perfil.md) | Types, repository, domain, store y página `/profile` en el CRM | Fases 2-3 | Pendiente |
| [fase5-gate-publicacion.md](fase5-gate-publicacion.md) | Exigir perfil completo para publicar un viaje | Fase 4 | Pendiente |
| [fase6-contrato-web.md](fase6-contrato-web.md) | Embed en `TRIP_SELECT`, filtro por estado, branding en tarjetas (repo web) | Fase 2 | Pendiente |
| [fase7-verificacion.md](fase7-verificacion.md) | Matriz de acceso, advisors y despliegue stage → prod | Todas | Pendiente |

> Al terminar cada fase, actualizar su "Estado" acá y en el propio documento de la fase.

La **Fase 6 solo depende de la 2**: en cuanto la tabla exista en stage, la sesión del repo
web puede integrar el embed en paralelo con la UI del CRM (coordinar por `SendMessage`).

---

## Estructura objetivo (global)

```
supabase/migrations/
├── <ts>_location_catalog.sql                 ← Fase 1
├── <ts>_agency_profiles.sql                  ← Fase 2
├── <ts>_agency_logos_storage.sql             ← Fase 3
└── <ts>_require_profile_to_publish.sql       ← Fase 5

app/
├── types/agency-profile.ts                    ← Fase 4 (nuevo)
├── composables/agency-profile/
│   ├── use-agency-profile-repository.ts       ← Fase 4 (nuevo)
│   └── use-agency-profile-domain.ts           ← Fase 4 (nuevo)
├── stores/use-agency-profile-store.ts         ← Fase 4 (nuevo)
├── components/agency-profile-form.vue         ← Fase 4 (nuevo)
├── components/agency-logo-upload.vue          ← Fase 4 (nuevo)
├── pages/profile.vue                          ← Fase 4 (nuevo)
└── components/user-menu.vue                   ← Fase 4 (modificado: "Account" → /profile)

viajeros-ligeros-web/app/
├── lib/trips-supabase.ts                      ← Fase 6 (embed + mapeo)
├── composables/use-trips.ts                   ← Fase 6 (filtro por estado)
└── components/trip/filters.vue                ← Fase 6 (selector de estado)
```

> Los nombres de archivo de migración se generan **siempre** con
> `supabase migration new <nombre>`, nunca a mano.

---

## Modelo de autorización resultante

| Recurso | Dueño (`id = auth.uid()`) | Otro usuario autenticado | Coordinador | `anon` |
|---|---|---|---|---|
| `agency_profiles` | SELECT + UPDATE de su fila | ❌ | ❌ (ver "Fuera de alcance") | SELECT si tiene ≥1 viaje `published` |
| `agency_profiles` INSERT/DELETE | ❌ (solo trigger / cascade) | ❌ | ❌ | ❌ |
| `countries`, `country_states` | SELECT | SELECT | SELECT | SELECT |
| `travels` → `published` | solo con perfil completo (Fase 5) | — | — | — |
| bucket `agency-logos` | RW dentro de `{su uid}/` | ❌ | ❌ | lectura (bucket público) |

---

## Fuera de alcance (confirmado o propuesto)

- **Tema del CRM desde el perfil:** los colores solo aplican a la web (decisión 3).
- **Países distintos de MX:** el catálogo lo soporta, pero la semilla es solo MX.
- **Lectura del perfil por coordinadores:** no hace falta para el CRM. Si la app móvil de
  coordinadores necesita el logo de la agencia, se agrega una policy aditiva con
  `private.is_travel_coordinator`, como en coordinator-access Fase 2.
- **Campos extra candidatos** (ciudad, sitio web, redes sociales, descripción de la agencia):
  no se incluyen en esta versión. Agregarlos es una migración `ALTER TABLE` sin impacto
  en RLS, y cualquiera de ellos también sería público.
- **Filtros por datos del viaje** (destino por catálogo, categorías, duración): esta
  feature cubre la dimensión "agencia". Mejorar los filtros por atributos del propio viaje
  es otra feature.
