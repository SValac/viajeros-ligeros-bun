# Feature: Sitio personalizable por agencia

**Estado:** ✅ COMPLETADA. PRs #60, #61 y #62 (2026-09-24) y #66 (página principal,
2026-09-25) mergeados a `main`. Las cuatro migraciones están en local, stage/QA y prod.
**Pendiente:** prueba de punta a punta con una agencia real. El proyecto de Vercel de la
agencia y los previews de qa/stage de la web todavía no tienen `NUXT_PUBLIC_AGENCY_ID`.
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
| #66 | `20260925194210_agency_home_page.sql` | `home_page jsonb` |

## RPC `get_public_agency_profile(p_agency_id uuid)`

La policy `agency_profiles_anon_published` solo deja a `anon` leer el perfil si la agencia
tiene al menos un viaje publicado. Una web de agencia única necesita la marca aunque la
agencia no tenga salidas (entre temporadas, o antes de lanzar), así que la lee por este RPC.

- `SECURITY DEFINER`, `STABLE`, `SET search_path = ''`. `EXECUTE` para `anon`,
  `authenticated` y `service_role`.
- Devuelve 0 o 1 fila, en este orden: `company_name`, `phone`, `logo_url`,
  `primary_color`, `secondary_color`, `country_code`, `state_code`, `state_name` (join a
  `country_states`), `tagline`, `contact_email`, `instagram_url`, `facebook_url`,
  `about_page`, `home_page`. Las columnas nuevas se agregan siempre al final.
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
- `icon` es una de 30 claves de lucide (lista en `PAGE_SECTION_ICONS`). La web la muestra como
  `i-lucide-<clave>` y usa un ícono por defecto si no la reconoce.
- **Los opcionales vacíos no se guardan:** se omite la llave en vez de guardar `""`. Para la
  web es importante, porque un `""` le hace descartar la sección entera.

### Validación en capas

1. **CRM (zod, completa):** `aboutPageSchema` en
   `app/composables/agency-profile/use-about-page-domain.ts`, con las secciones de
   `pageSectionsSchema` (`use-page-sections-domain.ts`). Valida longitudes, número de
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

## Página principal (`home_page jsonb`)

`NULL` = la web muestra su página principal predeterminada. El diseño y el orden son fijos
en la web: hero → viajes destacados (la cuadrícula se llena sola) → `sections` → CTA final
(los botones de WhatsApp y catálogo los pone la web).

```jsonc
{
  "hero":     { "title": "1–100", "description": "≤ 400, opcional, párrafos" },  // opcional
  "featured": { "headline": "≤ 40, opcional", "title": "1–100" },            // opcional
  "sections": [ /* 0 a 8, mismo contrato que about_page.sections */ ],        // siempre presente
  "cta":      { "title": "1–100", "description": "≤ 400, opcional, párrafos" }   // opcional
}
```

- **A diferencia de Nosotros, cada bloque fijo es opcional.** Si falta `hero`, `featured` o
  `cta`, la web usa su texto predeterminado para ese bloque. Así una agencia puede cambiar
  solo una parte. En el editor, un título vacío significa "bloque predeterminado":
  `serializeHomePage` omite el bloque. Si el título está vacío pero hay otro texto en el
  bloque, zod marca error en el título (si no, ese texto se perdería sin aviso).
- El CRM siempre escribe `sections` (puede ser `[]`). En un sitio de agencia, `sections`
  reemplaza la sección "Por qué viajar con nosotros" de Viajeros Ligeros; sin secciones no
  hay nada entre los destacados y el CTA.
- **Textos predeterminados:** `getHomePageDefaults` copia los de la web
  (`use-site-brand.ts` → `defaultAgencyHomePage`). Solo se usan como placeholders: los del
  antetítulo y la descripción se muestran mientras el título del bloque está vacío, porque
  con título propio los opcionales vacíos simplemente no aparecen. Si la web los cambia,
  hay que actualizarlos aquí.
- **CHECK `agency_profiles_home_page_valid`:** objeto; `hero` / `featured` / `cta` ausentes
  o con `title` string; `sections` array obligatorio con las mismas reglas que `about_page`;
  tope de 64 KB.
- **Plantilla de ejemplo:** la página principal de Viajeros Ligeros (`viajeros-ligeros-web`
  → `app/lib/home-page-viajeros-ligeros.ts`).

### Páginas del perfil

El perfil usa rutas anidadas. `app/pages/profile.vue` es el contenedor: encabezado, carga
del perfil, aviso de perfil incompleto y un menú de pestañas (`UNavigationMenu` con
`highlight`) ligado a la URL. Solo renderiza `<NuxtPage />` cuando el perfil ya cargó, porque
el formulario de cada pestaña se inicializa una vez a partir de él.

| Ruta | Nombre | Archivo | Contenido | Guarda con |
| --- | --- | --- | --- | --- |
| `/profile` | `profile` | `profile/index.vue` | Logo y datos generales (identidad, ubicación, presentación, contacto, marca) | `saveProfile` |
| `/profile/home` | `profile-home` | `profile/home.vue` | Página principal (`AgencyHomePageForm`) | `saveHomePage` |
| `/profile/about` | `profile-about` | `profile/about.vue` | Página Nosotros (`AgencyAboutPageForm`) | `saveAboutPage` |

Cada pestaña guarda solo sus campos. Para agregar una pestaña, se crea `app/pages/profile/<nombre>.vue` y se agrega su entrada al arreglo `tabs` de
`profile.vue`.

**Cambios sin guardar:** cada formulario calcula `isDirty` comparando lo que guardaría
(`mapFormToUpdate` / `serializeAboutPage` / `serializeHomePage`) con el perfil guardado, así que se limpia solo al
guardar. `useUnsavedChangesGuard(isDirty)` muestra `UnsavedChangesModal` (vía `useOverlay`)
al navegar dentro de la app, y el aviso nativo del navegador al cerrar o recargar la
pestaña. Se puede reusar en cualquier formulario que se renderice dentro de `<NuxtPage />`.

### Editor en el CRM

| Componente | Responsabilidad |
| --- | --- |
| `agency-about-page-editor.vue` | Nosotros: crear o quitar la página, hero, secciones, plantilla de ejemplo |
| `agency-home-page-editor.vue` | Página principal: personalizar o restaurar la predeterminada, bloques fijos, secciones, plantilla de ejemplo |
| `agency-home-block-fields.vue` | Un bloque fijo de la home (hero, destacados, CTA). Solo muestra los campos cuyo `v-model` se enlaza |
| `agency-page-sections-editor.vue` | Lista de secciones (compartida): agregar por tipo, subir, bajar, quitar |
| `agency-page-section-card.vue` | Una sección: campos comunes y los de su tipo |
| `agency-page-items-editor.vue` | Items de una sección (genérico): agregar, quitar, reordenar, respetando mín./máx.; slot `item-extra` para el ícono |
| `agency-page-confirm-modal.vue` | Confirmación de acciones que reemplazan o borran la página |
| `agency-icon-picker.vue` | `USelectMenu` con las 30 claves, con nombre en español e ícono |

El contrato de secciones (límites, íconos, schema, serialización, lectura) vive en
`use-page-sections-domain.ts`; `use-about-page-domain.ts` y `use-home-page-domain.ts` solo
agregan lo propio de cada página. Mismo reparto que en la web (`app/lib/page-sections.ts`).

- **Estado del editor ≠ JSON guardado:** en el editor los opcionales son `''`.
  `serializeAboutPage` / `serializeHomePage` recortan, quitan caracteres de control,
  normalizan párrafos y omiten los vacíos. `toAboutPage` / `toHomePage` leen el JSON
  guardado de forma tolerante y rellenan con `''`.
- **Plantilla de ejemplo (Nosotros):** copia el contenido real de Viajeros Ligeros
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
