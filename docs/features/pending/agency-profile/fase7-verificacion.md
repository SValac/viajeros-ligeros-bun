# Fase 7 — Verificación y despliegue

**Estado:** 🚧 Matriz local ✅, prueba manual de la UI en local ✅, migraciones en stage y
prod ✅ (2026-09-24, ambos `db push` sin errores). Código del CRM desplegado en `qa` y
`stage`. Pendiente: PR a `main`, merge de la web, advisors remotos y aviso a los dueños con
perfil incompleto.

## Prueba manual en local (2026-09-24, usuario nuevo `isaac@gmail.com`)

- Registro desde `/register` → el trigger creó el perfil vacío (`country_code = 'MX'`) ✅
- Perfil incompleto → "Publicado" deshabilitado en el formulario de viaje ✅
- Perfil completado desde `/profile`: teléfono normalizado a E.164 (`+52…`), colores en
  mayúsculas, estado guardado ✅
- Logo subido y cambiado → queda **un solo** archivo en `{uid}/` (el anterior se borró) ✅
- Con el perfil completo → el viaje se publicó ✅
**Dependencia:** todas

## Resultado local (2026-09-24)

Script SQL en una transacción con `ROLLBACK`, simulando cada rol con
`SET ROLE` + `request.jwt.claims`, contra la base local después de `db:reset`:

| Caso | Resultado |
|---|---|
| Trigger: dueño nuevo recibe perfil; coordinador invitado no | ✅ |
| `anon` lee las 32 entidades del catálogo | ✅ |
| `anon` ve solo agencias con viaje publicado | ✅ |
| `anon` no puede actualizar (`permission denied`) | ✅ |
| Usuario B ve solo su perfil y no puede actualizar el de otro (0 filas) | ✅ |
| INSERT de perfil desde `authenticated` → `permission denied` | ✅ |
| Teléfono sin `+52` → CHECK `agency_profiles_phone_e164` | ✅ |
| Estado inexistente → FK `agency_profiles_state_fk` | ✅ |
| Perfil incompleto + INSERT o UPDATE a `published` → `agency_profile_incomplete` | ✅ |
| Perfil completo → publica | ✅ |
| Viaje ya publicado + perfil vaciado + editar otra columna → OK | ✅ |
| B publica su primer viaje → pasa a ser visible para `anon` | ✅ |
| UPDATE de perfil no falla (el trigger `moddatetime('updated_at')` es válido) | ✅ |
| Logo en la carpeta propia → OK; en la carpeta de otro → RLS | ✅ |
| Coordinador no ve ningún perfil | ✅ |
| Embed `travels → agency_profiles → country_states` vía REST como `anon` | ✅ |

[← Volver al plan](PLAN.md)

---

## Matriz de acceso (local y luego stage)

Actores: **A** (agencia con viaje publicado), **B** (agencia sin viajes publicados),
**C** (coordinador de A), **anon**.

| Acción | A | B | C | anon |
|---|---|---|---|---|
| Leer su propio perfil | ✅ | ✅ | — (no tiene) | — |
| Leer perfil de A | ✅ | ❌ | ❌ | ✅ |
| Leer perfil de B | ❌ | ✅ | ❌ | ❌ (sin viajes publicados) |
| Actualizar perfil de A | ✅ | ❌ | ❌ | ❌ |
| Insertar / borrar un perfil | ❌ | ❌ | ❌ | ❌ |
| Leer catálogo de estados | ✅ | ✅ | ✅ | ✅ |
| Escribir en `agency-logos/{A}/` | ✅ | ❌ | ❌ | ❌ |
| Publicar viaje con perfil incompleto | ❌ | ❌ | ❌ | ❌ |

Casos adicionales:
- [ ] Registrar un usuario nuevo → perfil creado
- [ ] Invitar un coordinador → **sin** perfil; el registro no falla
- [ ] B publica su primer viaje → su perfil pasa a ser visible para `anon`
- [ ] B despublica su único viaje → su perfil deja de ser visible para `anon`

## Advisors

- [ ] `get_advisors` de seguridad y performance limpios en local y stage. Revisar en
      particular: RLS habilitado en las 3 tablas nuevas, `search_path` fijo en las funciones
      nuevas y el índice `travels_owner_id_idx` presente

## Despliegue

1. `bun run db:push:stage` (lo corre el usuario)
2. Verificar la matriz en stage + probar el CRM en el Preview de stage
3. Avisar a la sesión web (Fase 6) y que pruebe contra stage
4. `bun run db:push:prod` (lo corre el usuario)
5. **Recién después**, desplegar la web a prod
6. Listar en prod los dueños de viajes ya publicados con perfil
   incompleto y avisarles. El trigger no afecta a esos viajes, pero la web los mostrará sin
   agencia hasta que completen el perfil

## Cierre

- [ ] Mover `docs/features/pending/agency-profile/` a `completed/`, dejando en `pending/`
      solo lo que quede abierto (convención del repo)
- [ ] Actualizar estados en `PLAN.md`
