# Fase 7 — Verificación y despliegue

**Estado:** Completada ✅ (2026-09-24). Matriz local, prueba manual de la UI en local, pruebas
del usuario en QA y stage, y migraciones en stage y prod (`db push` sin errores). Quedan
**seguimientos operativos** sin código en este repo (ver "Seguimientos" al final).
**Dependencia:** todas

## Prueba manual en local (2026-09-24, usuario nuevo `isaac@gmail.com`)

- Registro desde `/register` → el trigger creó el perfil vacío (`country_code = 'MX'`) ✅
- Perfil incompleto → "Publicado" deshabilitado en el formulario de viaje ✅
- Perfil completado desde `/profile`: teléfono normalizado a E.164 (`+52…`), colores en
  mayúsculas, estado guardado ✅
- Logo subido y cambiado → queda **un solo** archivo en `{uid}/` (el anterior se borró) ✅
- Con el perfil completo → el viaje se publicó ✅

## QA y stage (2026-09-24)

- Código mergeado a `qa` y `stage`, desplegado en sus Previews de Vercel ✅
- Pruebas del usuario en ambos Previews contra la base de stage: completadas ✅

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
- [x] Registrar un usuario nuevo → perfil creado (SQL y registro real desde `/register`)
- [x] Invitar un coordinador → **sin** perfil (SQL con `coordinator_id` en la metadata)
- [x] B publica su primer viaje → su perfil pasa a ser visible para `anon`
- [ ] B despublica su único viaje → su perfil deja de ser visible para `anon` (no probado
      explícitamente; se deduce del `EXISTS ... status = 'published'` de la policy)

## Advisors

- [x] Local: `supabase db lint` limpio para las funciones nuevas (solo marca
      `generate_travel_access_code`, que ya existía)
- [ ] Remoto: advisors de seguridad y performance en el dashboard de stage/prod (seguimiento)

## Despliegue

1. [x] `bun run db:push:stage`
2. [x] Probar el CRM en los Previews de QA y stage
3. [x] Avisar a la sesión web (Fase 6)
4. [x] `bun run db:push:prod`
5. [ ] Mergear este PR a `main`
6. [x] Web mergeada a `main` (repo web, PR #4). Entró antes que este PR, sin riesgo porque la
       base de prod ya tenía las migraciones
7. [ ] Listar en prod los dueños con viajes ya publicados y perfil incompleto, y avisarles
       (seguimiento)

## Seguimientos (sin código en este repo)

- ~~**Web:** mergear `feat/agency-profile` en `viajeros-ligeros-web`~~ ✅ hecho (PR #4).
  Falta ver en prod la insignia y el filtro con datos reales, cuando alguna agencia complete
  su perfil y tenga un viaje publicado.
- **Advisors remotos** de seguridad y performance en el dashboard de prod.
- **Dueños con perfil incompleto:** esta consulta, en el SQL editor de prod, lista quién
  tiene viajes publicados sin agencia visible en la web:
  ```sql
  select u.email, count(t.id) as viajes_publicados
  from public.travels t
  join public.agency_profiles p on p.id = t.owner_id
  join auth.users u on u.id = t.owner_id
  where t.status = 'published'
    and (p.company_name is null or p.state_code is null)
  group by u.email;
  ```

## Cierre

- [x] Docs movidos de `pending/agency-profile/` a `completed/agency-profile/`
- [x] Estados actualizados en `PLAN.md`
