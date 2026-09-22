# Fase 4 — Invitación de coordinadores

**Estado:** ✅ Completa
**Dependencia:** Fase 1 (necesita `coordinators.user_id`). Independiente de las Fases 2-3,
puede ir en paralelo.
**Entregables:** Edge Function `invite-coordinator` (la **primera del repo**) + UI en la
web admin.

---

## Objetivo

Que el admin pueda, desde la web, invitar a un coordinador de su directorio a usar la app
móvil — creando su usuario de auth y vinculándolo a `coordinators.user_id`.

---

## Por qué hace falta una Edge Function

Crear un usuario de auth requiere la **service_role key**. Este proyecto es una SPA
(`ssr: false`) que corre con la anon key en el navegador, así que **no hay ningún lugar
seguro en el cliente para esa key** — exponerla daría acceso total a la base, saltándose
todo el RLS.

No hay atajo por el lado del cliente:

| Alternativa | Por qué no |
|---|---|
| `supabase.auth.admin.inviteUserByEmail()` desde la SPA | Necesita service_role. Descartado. |
| Que el coordinador se registre solo | Cualquiera con la anon key podría crearse cuenta. La agencia debe controlar quién entra. |
| Invitar a mano desde el Dashboard | Funciona para arrancar con 2 coordinadores, pero el vínculo `user_id` queda manual y propenso a error. **Sirve como paso previo para desbloquear las Fases 2-3 antes de construir esta.** |
| Server route de Nuxt | El proyecto es `ssr: false`; introducir un servidor Nuxt es un cambio de arquitectura mayor. |

Una Edge Function corre en el servidor de Supabase, recibe la service_role key por variable
de entorno y nunca la expone.

> **Atajo válido:** si querés avanzar con las Fases 2-3 antes que ésta, vinculá el usuario
> a mano con el `UPDATE` de la Fase 1. Esta fase automatiza el proceso, no lo habilita.

---

## Bloque 1: `supabase/functions/invite-coordinator/index.ts`

El contrato: recibe `{ coordinatorId }`, devuelve `{ ok, email }` o un error tipado.

Pasos de la función, en orden — **el orden importa**:

1. **Leer el JWT del header `Authorization`.** Crear un cliente con la **anon key** y ese
   token para identificar al que llama (`auth.getUser()`). Si no hay usuario válido → 401.
2. **Verificar propiedad.** Con ese mismo cliente (sujeto a RLS, que es el punto), leer
   `coordinators` por `coordinatorId`. Si no devuelve fila, el que llama **no es el dueño**
   → 403. Dejar que RLS haga la verificación en vez de comparar `owner_id` a mano es más
   difícil de equivocar.
3. **Validar estado.** Si `user_id` ya no es `NULL` → error `already_invited`. Si `email`
   está vacío → `missing_email`.
4. **Recién ahora**, crear un segundo cliente con la **service_role key** e invitar:
   `auth.admin.inviteUserByEmail(email, { data: { coordinator_id } })`.
5. **Vincular:** `UPDATE coordinators SET user_id = <nuevo-uid> WHERE id = <coordinatorId>`
   con el cliente service_role.
6. Devolver `{ ok: true, email }`.

### Reglas no negociables

- **El chequeo de autorización va ANTES de tocar la service_role key.** Una vez que usás
  ese cliente, RLS deja de existir: es la única línea de defensa del endpoint.
- **Rol en `app_metadata`, jamás en `user_metadata`.** `raw_user_meta_data` es
  **editable por el propio usuario** y aparece en `auth.jwt()`. Si alguna vez una policy o
  la app móvil decide algo en base a un claim de rol, tiene que leerlo de `app_metadata`.
  Guardar `role: 'coordinator'` ahí le sirve a la app móvil para distinguir el tipo de
  cuenta al iniciar.
- **CORS**: la función se llama desde el navegador, así que necesita manejar el preflight
  `OPTIONS` y devolver los headers `Access-Control-Allow-*`.

### Casos borde a resolver

| Caso | Qué hacer |
|---|---|
| El email ya existe como usuario de auth | `inviteUserByEmail` falla. Decidir: ¿vincular al usuario existente (¿cómo se obtiene su id de forma segura?) o devolver `email_already_registered` y pedir otro email? **Lo segundo es más simple y más seguro.** |
| El email es el del propio admin | Quedaría una cuenta que es owner **y** coordinador. Las policies son aditivas, así que técnicamente funciona — pero es confuso. Rechazarlo explícitamente. |
| El invitado nunca acepta | El usuario de auth queda creado y `user_id` seteado, pero sin confirmar. Mostrarlo en la UI como "invitación pendiente". |
| Se invita dos veces | El paso 3 lo corta. El `UNIQUE` en `user_id` es la red de seguridad a nivel base. |

### Método de login

`inviteUserByEmail` manda un mail con un link de seteo de contraseña — es el camino más
corto y no necesita configurar nada más.

Para personal de campo, **OTP por SMS** (`signInWithOtp({ phone })`) suele ser mejor UX: ya
tenés el teléfono en `coordinators.phone` y elimina el manejo de contraseñas (olvidos y
reseteos a mitad de un viaje). Requiere configurar Twilio en `[auth.sms]` de
`config.toml` — hay un bloque `[auth.sms.twilio]` ya presente pero sin credenciales, y
tiene costo por mensaje.

**Decisión pendiente:** ¿email + password (más simple, listo hoy) o SMS OTP (mejor UX,
necesita Twilio)? **No cambia nada del modelo de datos ni de las Fases 1-3** — se puede
arrancar con email y migrar después.

---

## Bloque 2: revocar el acceso

Tan importante como invitar, y con una trampa.

```sql
UPDATE public.coordinators SET user_id = NULL WHERE id = '<coordinator-id>';
```

⚠️ **Esto NO expulsa al coordinador de inmediato.** Su access token JWT sigue siendo válido
hasta que expire (1 hora por defecto), y durante ese rato las policies siguen evaluando…
bueno, en realidad no: los helpers consultan `coordinators` **en cada evaluación**, así que
al poner `user_id = NULL` el `EXISTS` da `false` y el acceso se corta al instante. **Ésta
es una ventaja concreta del enfoque por tabla frente a meter el rol en un claim del JWT**,
donde el cambio no se aplica hasta el refresh del token.

Lo que **sí** sobrevive es la sesión en sí: el usuario sigue logueado y puede llamar
endpoints, solo que no ve datos. Para cortar de verdad hay que revocar la sesión
(`auth.admin.signOut(userId)`) desde la Edge Function. Nota relacionada: **borrar un
usuario de auth tampoco invalida sus tokens vigentes.**

La revocación de acceso puede vivir en la misma Edge Function con una acción distinta, o en
una segunda función. Como el `UPDATE` de `coordinators` sí lo puede hacer el admin desde el
cliente (RLS `coordinators_owner` lo permite), el corte de datos funciona sin Edge
Function; solo el `signOut` necesita service_role.

---

## Bloque 3: UI en la web admin

Seguir el patrón del repo: **Repository → Domain → Store → Componente** (ver
`app/composables/travelers/` y `app/stores/use-travel-media-store.ts` como referencia de
estilo).

- `app/types/coordinator.ts` — agregar `userId: string | null` al tipo de dominio, y el
  estado derivado de invitación.
- `app/composables/coordinators/use-coordinator-repository.ts` — método que llame a la Edge
  Function con `supabase.functions.invoke('invite-coordinator', { body: { coordinatorId } })`.
- `use-coordinator-domain.ts` — `toCoordinatorInviteError` traduciendo los códigos de la
  función a mensajes de dominio, siguiendo el patrón de `toTravelAccessCodeError`.
- `use-coordinator-store.ts` — acción `inviteCoordinator`.
- `coordinator-invite-button.vue` — botón + estado.

### Recordatorios de convenciones del repo

- Los mappers (`mapCoordinatorRowToDomain`) van en `app/utils/mappers.ts` (auto-importado);
  el composable `use-*-domain.ts` es solo para error-mapping y lógica de dominio pura.
- Los composables en subcarpetas (`composables/coordinators/*.ts`) **no** se auto-importan
  — necesitan `import` explícito.
- Correr `bun run db:types` después de la Fase 1 para que `user_id` esté en
  `database.types.ts`.
- ⚠️ **Ojo con el patrón de `onMounted`**: el bug de la Fase 5 de la feature de código de
  acceso fue olvidar una llamada de carga en `onMounted`. Si el componente necesita datos
  de dos stores, las dos llamadas van en un solo `await Promise.all([a(), b()])` — con el
  `await` **afuera**, envolviendo el `Promise.all`, no dentro de cada elemento del array.

### Estados a mostrar

| Estado | Condición | Acción |
|---|---|---|
| Sin cuenta | `userId === null` | Botón "Invitar a la app" |
| Invitación pendiente | `userId !== null`, sin confirmar | Badge + "Reenviar invitación" |
| Activo | `userId !== null`, confirmado | Badge + "Revocar acceso" |
| Sin email | `email` vacío | Botón deshabilitado con tooltip |

Saber si está "confirmado" requiere leer `auth.users.email_confirmed_at`, que el cliente no
puede consultar. Opciones: agregar `invited_at` a `coordinators` y mostrar
"pendiente/activo" de forma aproximada, o que la Edge Function devuelva el estado. **Lo
primero es más simple y suficiente.**

> **Decisión final (implementación):** se simplificó a solo dos estados — "sin cuenta"
> (`userId === null`, botón "Invitar") y "invitado" (`userId !== null`, badge + "Revocar").
> No se agregó `invited_at` ni distinción pendiente/activo ni botón de "reenviar
> invitación". Suficiente para el volumen actual (pocos coordinadores, la agencia sabe si
> ya invitó a alguien); reconsiderar si hace falta reenviar una invitación expirada sin
> tener que revocar y volver a invitar.

---

## Verificación

- [x] Admin invita a un coordinador propio → llega el email, `user_id` queda seteado
- [x] El coordinador acepta, setea contraseña y puede loguearse (validado en Fase 2/3 con
      el usuario coordinador de prueba; el link/OTP de Mailpit funciona igual para
      cualquier invitación de esta fase)
- [x] Logueado, ve **solo** sus viajes asignados (revalida las Fases 2-3 end-to-end)
- [x] Admin A intenta invitar a un coordinador de la agencia B → **403** (`not_authorized`)
- [x] Llamar a la función sin `Authorization` → **401**
- [x] Invitar dos veces al mismo → `already_invited` (409)
- [x] Invitar con email ya registrado → `email_already_registered` (409), no un 500
- [x] Coordinador sin email → botón deshabilitado en la UI, y la función devuelve
      `missing_email` (400) si se llama igual
- [x] Revocar (`user_id = NULL`) → el coordinador deja de ver datos **de inmediato**, sin
      esperar el refresh del token
- [x] La service_role key **no** aparece en el bundle del cliente: `bun run build` +
      `grep -rli "service_role" .output/` sin resultados
- [x] `bun run typecheck` y `bun run lint` limpios (el único error de lint pendiente en el
      repo es preexistente en `plans/supabase-sanitization-validations.md`, sin relación
      con esta fase)

### Bug encontrado y arreglado durante la verificación manual

`revokeAccess()` hacía `update({ user_id: null })` sin `.select()` — PostgREST devuelve
`204` igual aunque RLS bloquee la fila (0 filas afectadas), así que un revoke fallido se
veía como éxito y la UI se quedaba pegada sin ningún error. Encadenar `.select().single()`
(mismo patrón que ya usaba `update()`) hace que un update bloqueado lance un error real.
Causa más probable del caso real: la sesión del browser no era la del admin dueño al hacer
el click. Ver commit `fix(coordinator-access): revokeAccess quedaba como no-op silencioso`.

### Datos de prueba usados

Agencia A (`dev@viajeros-ligeros.local`, seed) para los casos propios; agencia B fue el
propio usuario de prueba `isaac@gmail.com` (creado en Fase 2/3 como coordinador sin
ownership) reutilizado como dueño de un coordinador nuevo (`Liberty Galloway`) para probar
el 403 cross-tenant — no hizo falta crear una tercera identidad.

---

## Comandos (los corre el usuario)

```bash
supabase functions new invite-coordinator
supabase functions serve invite-coordinator   # local
bun run db:types && bun run typecheck && bun run lint:fix
# deploy (remoto — decisión del usuario):
supabase functions deploy invite-coordinator
```
