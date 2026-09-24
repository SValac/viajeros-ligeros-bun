# Feature: Sitio personalizable por agencia

**Estado:** ✅ COMPLETADA (2026-09-24). PRs #60, #61 y #62 mergeados a `main`. Las tres
migraciones están en local, stage/QA y prod.
**Continúa:** [agency-profile/PLAN.md](agency-profile/PLAN.md). Cubre los "campos extra
candidatos" que esa feature dejó fuera de alcance.
**Repo web:** `viajeros-ligeros-web` implementa el lado público. Se coordina con la sesión
paralela de ese repo por `SendMessage`.

---

## Contexto

La web pública tiene un **modo agencia única**. Con `NUXT_PUBLIC_AGENCY_ID`, un deploy
aparte de la misma web muestra solo los viajes de esa agencia y usa su marca. Para eso,
cada agencia edita desde el CRM (perfil de agencia, ver [Páginas del perfil](#páginas-del-perfil)) el contenido de su sitio. La web pone
el diseño; la agencia solo controla el contenido.

| PR | Migración | Qué agrega |
| --- | --- | --- |
| #60 | `20260924165343_public_agency_profile_rpc.sql` | RPC `get_public_agency_profile` |
| #61 | `20260924173904_agency_profile_site_content.sql` | `tagline`, `contact_email`, `instagram_url`, `facebook_url` (y `about`, ya eliminado) |
| #62 | `20260924183111_agency_about_page.sql` | `about_page jsonb` (reemplaza a `about`) |

## RPC `get_public_agency_profile(p_agency_id uuid)`

La policy `agency_profiles_anon_published` solo deja a `anon` leer el perfil si la agencia
tiene al menos un viaje publicado. Una web de agencia única necesita la marca aunque la
agencia no tenga salidas (entre temporadas, o antes de lanzar), así que la lee por este RPC.

- `SECURITY DEFINER`, `STABLE`, `SET search_path = ''`. `EXECUTE` para `anon`,
  `authenticated` y `service_role`.
- Devuelve 0 o 1 fila, en este orden: `company_name`, `phone`, `logo_url`,
  `primary_color`, `secondary_color`, `country_code`, `state_code`, `state_name` (join a
  `country_states`), `tagline`, `contact_email`, `instagram_url`, `facebook_url`,
  `about_page`.
- Solo si el perfil está completo (`company_name` y `state_code` no nulos), el mismo
  criterio que `private.ensure_profile_complete_on_publish`. Si se cambia uno, hay que
  cambiar el otro.
- Recibe un id concreto, así que no permite enumerar agencias. La policy existente no cambió.
- Cambiar sus columnas exige `DROP` + `CREATE` y volver a dar los grants. La web lo llama
  sin fallback, así que su forma es una API entre repos: coordinar antes de tocarla.
- `supabase gen types` marca todas las columnas del RPC como no nulas, pero todas menos
  `company_name`, `country_code`, `state_code` y `state_name` pueden venir `null`.

## Campos del sitio (`agency_profiles`)

Todos son opcionales: `NULL` significa "no configurado". Los CHECK rechazan cadenas que
solo tengan espacios o saltos de línea (`btrim()` no quita saltos de línea, por eso se usa
`~ '[^[:space:]]'`).

| Columna | Dónde aparece en la web | Regla |
| --- | --- | --- |
| `tagline` | Pie de página | Una línea, ≤ 120 |
| `contact_email` | Pie de página | `x@y.z`, ≤ 254. El CRM lo guarda en minúsculas |
| `instagram_url` | Ícono en el pie | `^https://(www\.)?instagram\.com/\S+$`, ≤ 200 |
| `facebook_url` | Ícono en el pie | `^https://(www\.)?facebook\.com/\S+$`, ≤ 200 |
| `primary_color` | Acento principal del sitio y tarjetas de viaje | Ya existía |
| `secondary_color` | Títulos pequeños sobre cada sección. Sin él, se usa el primario | Ya existía |

## Página Nosotros (`about_page jsonb`)

`NULL` = la agencia no tiene página Nosotros (la web responde 404 y no la muestra en el
menú). Todo el texto es plano, sin HTML.

```jsonc
{
  "hero": { "title": "1–100", "description": "≤ 400, opcional" },
  "sections": [ /* 0 a 8, en orden */
    { "type": "text", "headline": "≤ 40, opc.", "title": "1–100", "description": "1–1000, párrafos separados por línea en blanco" },
    { "type": "features", "headline": "…", "title": "…", "description": "≤ 400, opc.",
      "items": [ /* 2–8 */ { "title": "1–60", "description": "1–200", "icon": "clave de la lista" } ] },
    { "type": "steps", "headline": "…", "title": "…",
      "items": [ /* 2–6 */ { "title": "1–60", "description": "1–200" } ] }
  ]
}
```

- Los títulos y el `headline` no admiten saltos de línea.
- Los números de los pasos (01, 02…) los genera la web a partir del orden; no se guardan.
- El CTA final de WhatsApp es fijo en la web y no se configura.
- `icon` es una de 30 claves de lucide (lista en `ABOUT_PAGE_ICONS`). La web la muestra como
  `i-lucide-<clave>` y usa un ícono por defecto si no la reconoce.
- **Los opcionales vacíos no se guardan:** se omite la llave en vez de guardar `""`. Para la
  web es importante, porque un `""` le hace descartar la sección entera.

### Validación en capas

1. **CRM (zod, completa):** `aboutPageSchema` en
   `app/composables/agency-profile/use-about-page-domain.ts`. Valida longitudes, número de
   items e íconos.
2. **Base (CHECK `agency_profiles_about_page_valid`, estructural):** objeto; `hero` objeto
   con `title` string; `sections` array de ≤ 8; cada sección un objeto con `type` en
   `text` / `features` / `steps`; tope de 64 KB. Evita que una escritura directa a la API
   guarde algo que la web no pueda enrutar.
3. **Web (TypeScript plano, al leer):** descarta secciones inválidas una por una. Dejó de
   usar zod porque rompía el SSR con `bun --bun nuxt dev`.

Detalles del CHECK que no son obvios:
- Va envuelto en `about_page IS NULL OR COALESCE(…, false)`, porque un CHECK que evalúa a
  `NULL` **pasa**, y una llave faltante produce `NULL`.
- El `CASE` evita que `jsonb_array_length()` corra sobre algo que no es un array (el `AND`
  de Postgres no garantiza el orden de evaluación).
- Tipos de sección: compara el largo de `sections` contra un jsonpath `strict` que solo
  conserva las secciones válidas. Un `type` faltante hace fallar el path (con
  `silent = true` devuelve vacío), así que los conteos no coinciden.
- **64 KB, no 20 000 bytes:** una página con todos los campos al máximo pesa ~47 KB. Con
  20 000, una agencia podía respetar todos los contadores y aun así no poder guardar. El tope
  es solo un respaldo; lo que la agencia encuentra son los límites por campo.

### Páginas del perfil

El perfil usa rutas anidadas. `app/pages/profile.vue` es el contenedor: encabezado, carga
del perfil, aviso de perfil incompleto y un menú de pestañas (`UNavigationMenu` con
`highlight`) ligado a la URL. Solo renderiza `<NuxtPage />` cuando el perfil ya cargó, porque
el formulario de cada pestaña se inicializa una vez a partir de él.

| Ruta | Nombre | Archivo | Contenido | Guarda con |
| --- | --- | --- | --- | --- |
| `/profile` | `profile` | `profile/index.vue` | Logo y datos generales (identidad, ubicación, presentación, contacto, marca) | `saveProfile` |
| `/profile/about` | `profile-about` | `profile/about.vue` | Página Nosotros (`AgencyAboutPageForm`) | `saveAboutPage` |

Cada pestaña guarda solo sus campos. Para agregar una pestaña (por ejemplo, "Home"), se
crea `app/pages/profile/<nombre>.vue` y se agrega su entrada al arreglo `tabs` de
`profile.vue`. Las ediciones sin guardar se pierden al cambiar de pestaña.

### Editor en el CRM

| Componente | Responsabilidad |
| --- | --- |
| `agency-about-page-editor.vue` | Crear o quitar la página, hero, lista de secciones, agregar sección por tipo, plantilla de ejemplo, modal de confirmación |
| `agency-about-section-card.vue` | Una sección: campos comunes y los de su tipo, subir, bajar, quitar |
| `agency-about-items-editor.vue` | Items de una sección (genérico): agregar, quitar, reordenar, respetando mín./máx.; slot `item-extra` para el ícono |
| `agency-icon-picker.vue` | `USelectMenu` con las 30 claves, con nombre en español e ícono |

- **Estado del editor ≠ JSON guardado:** en el editor los opcionales son `''`.
  `serializeAboutPage` recorta, quita caracteres de control, normaliza párrafos y omite los
  vacíos. `toAboutPage` lee el JSON guardado de forma tolerante y rellena con `''`.
- **Plantilla de ejemplo:** copia el contenido real de Viajeros Ligeros
  (`viajeros-ligeros-web` → `app/lib/about-page-viajeros-ligeros.ts`) y pone el nombre de la
  agencia en el hero.
- **Claves de `v-for`:** las secciones y los items no tienen id. `createListKeys` asigna
  claves estables por objeto con un `WeakMap`, para que cada input siga a su elemento al
  reordenar.
- Los errores de zod se muestran en el campo correcto porque Nuxt UI une la ruta con puntos
  (`aboutPage.sections.2.items.0.title`), y cada `UFormField` anidado usa ese `name`.

## Despliegue

Orden usado: migración en local → stage/QA → prod, y después el PR a `main`. La web tolera
columnas faltantes (las trata como `null`), así que no hubo un orden obligatorio entre web y
CRM.

La migración de #62 elimina `about`, pero antes aborta si alguna fila tiene datos en esa
columna. No se disparó en ningún entorno.
