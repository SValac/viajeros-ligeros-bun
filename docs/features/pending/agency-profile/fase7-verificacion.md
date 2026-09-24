# Fase 7 — Verificación y despliegue

**Estado:** Pendiente
**Dependencia:** todas

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
