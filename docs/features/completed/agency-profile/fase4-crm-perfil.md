# Fase 4 — Perfil en el CRM

**Estado:** Completada ✅ (local). `typecheck` limpio. Subpaso 1 escrito por el usuario (modo
mentor); subpasos 2-5 implementados por el asistente a pedido del usuario.
**Dependencia:** Fases 2 y 3

### Subpasos

| # | Subpaso | Estado |
|---|---|---|
| 1 | `app/types/agency-profile.ts` | ✅ |
| 2 | Repository + mappers en `app/utils/mappers.ts` | ✅ |
| 3 | Domain | ✅ |
| 4 | Store | ✅ |
| 5 | Componentes + página + `user-menu` | ✅ |

### Decisiones de implementación

- **Mappers fila → dominio** en `app/utils/mappers.ts` (convención del repo), no en el domain.
  El domain queda con la lógica pura: normalización del formulario, teléfono E.164,
  validación del logo, `isProfileComplete`, `getLogoStoragePath`.
- **El uid se lee de `supabase.auth.getSession()`**, no de `useAuthStore`: los plugins
  corren antes que el middleware `auth.global.ts` que llena el auth store.
- **El store se carga bajo demanda** (página `/profile` y `travel-form`), no en
  `init-stores.client.ts`, que también corre en `/login`.
- **`fetchMine()` usa `.single()`:** todo dueño tiene fila (trigger), así que una fila
  faltante es un error visible y no un `null` silencioso.
- **Path del logo derivado de la URL pública** (`getLogoStoragePath`), sin columna
  `logo_path`.
- **El formulario no se re-sincroniza con el perfil** después de montarse: si lo hiciera,
  subir un logo borraría las ediciones sin guardar. La página monta el formulario solo
  cuando el perfil ya cargó.
- Componentes: `agency-profile-form` (formulario), `agency-logo-upload` (logo),
  `agency-color-input` (`defineModel<string | null>`, usado dos veces) y
  `agency-brand-preview` (vista previa de la tarjeta en la web, con color de texto por
  luminancia).

### Decisiones tomadas en los types

- `AgencyProfileFormData` se declara **explícito**, no con `Pick`/`Omit` de `AgencyProfile`,
  porque la nulabilidad del formulario difiere de la de la fila.
- **`companyName: string` es obligatorio en el formulario (opción A).** El domain rechaza el
  nombre vacío, así que `update()` nunca recibe `null` para ese campo. Encaja con la Fase 5
  (sin nombre no se publica).
- `phone`, `stateCode` y los colores son `string | null`: son opcionales. El domain
  normaliza `''` → `null` antes de guardar.
- `AgencyProfileUpdateData.logoUrl?: string | null`: es opcional porque el formulario no lo
  manda, y nullable para poder quitar el logo.
- Lección: `Omit<T, K>` **no valida** que `K` exista en `T` (`K extends keyof any`). Con
  claves mal escritas omite nada y en silencio. `Pick` sí falla la compilación.
**Skills:** vue, nuxt, nuxt-ui, pinia

[← Volver al plan](../../pending/agency-profile/PLAN.md)

---

## Objetivo

Que el usuario pueda ver y editar su perfil de agencia desde el CRM, siguiendo las mismas
capas que el resto de módulos (types → repository → domain → store → componentes →
página). Referencia de estilo: el módulo de coordinadores
(`app/composables/coordinators/*`, `app/stores/use-coordinator-store.ts`).

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `app/types/agency-profile.ts` | `AgencyProfile`, `AgencyProfileUpdate`, `CountryState` (camelCase) |
| `app/composables/agency-profile/use-agency-profile-repository.ts` | I/O con Supabase: `getMine()`, `update()`, `listStates(countryCode)`, `uploadLogo()`, `removeLogo()` |
| `app/composables/agency-profile/use-agency-profile-domain.ts` | Mapeo fila ↔ tipo, validación de formulario (schema), `isProfileComplete()`, normalización de teléfono |
| `app/stores/use-agency-profile-store.ts` | Estado del perfil del usuario actual + catálogo de estados; acciones `fetch`, `save`, `changeLogo` |
| `app/components/agency-profile-form.vue` | Formulario (empresa, estado, teléfono, colores) |
| `app/components/agency-logo-upload.vue` | Selección, preview y subida del logo |
| `app/pages/profile.vue` | Página `/profile` que compone ambos |
| `app/components/user-menu.vue` | "Account" (hoy comentado) → "Perfil de agencia", `to: '/profile'` |

## Detalles por capa

### Repository

- `update()` **siempre** encadena `.select().single()`. Un `UPDATE` bloqueado por RLS no da
  error, devuelve 0 filas. Sin `.select()` el fallo es silencioso (ya pasó con revoke de
  coordinadores: [[bugfix_revoke_coordinator_silent_noop]]).
- `getMine()` filtra por `id = auth.uid()` explícito aunque la RLS ya lo haga: deja claro
  el intento y no depende de que solo haya una fila visible.
- `listStates('MX')` ordena por `name`.

### Domain

- **Teléfono:** el usuario escribe `33 1234 5678` y se guarda como `+523312345678`. Con el
  país fijo en MX, el prefijo `+52` se agrega en el domain. El CHECK de la base es la red
  de seguridad, no la validación primaria.
- **Colores:** `UColorPicker` / `UInput type="color"` de Nuxt UI devuelve hex. Se normaliza
  a mayúsculas `#RRGGBB`.
- **Texto:** `company_name` pasa por el sanitizador existente (`use-sanitized-model`), con
  el cuidado de no reintroducir el bug de espacios ([[bugfix_sanitize_text_strips_spaces]]).
- `isProfileComplete(profile)` = `companyName` y `stateCode` no vacíos. La usan la página
  y la Fase 5.

### Store

- Carga perezosa: `fetch()` se llama al entrar a `/profile` y, si se confirma la Fase 5,
  también desde el formulario de viaje.
- Se limpia en logout. El login ya fuerza un reload completo
  ([[bugfix_login_stale_stores]]), así que no hay perfil de otro usuario colgado.

### Logo

Flujo de `changeLogo(file)`:
1. Validar tipo (png/jpeg/webp) y tamaño (≤ 2 MB) en el cliente, para dar un mensaje claro
   antes del rechazo del bucket.
2. Subir a `{uid}/logo-{Date.now()}.{ext}`.
3. `update({ logo_url })` con la URL pública.
4. Recién entonces borrar el archivo anterior. Si el paso 3 falla, se borra el **nuevo** y
   el perfil queda con el logo anterior intacto.

### Página `/profile`

- Secciones con `UPageCard` o equivalente: **Identidad** (empresa, logo), **Ubicación**
  (país, fijo en "México" y deshabilitado por ahora; estado con `USelectMenu`), **Contacto**
  (teléfono), **Marca** (color primario y secundario, con preview de cómo se vería una
  tarjeta de viaje en la web).
- Banner si el perfil está incompleto: "Completa el nombre de tu empresa y tu estado para
  que tus viajes aparezcan correctamente en la web".

## Verificación

- [ ] Editar y guardar cada campo; recargar y comprobar que persiste
- [ ] Cambiar el logo dos veces → solo queda un archivo en `{uid}/`
- [ ] Teléfono inválido → error en el formulario, sin llegar a la base
- [ ] Usuario sin perfil completo ve el banner
- [ ] `bun run typecheck` y `bun run lint:fix` limpios
