# Código de Acceso al Viaje — Fase 6: Verificación end-to-end

**Objetivo:** Validar el flujo completo (DB + RPC + UI) antes de dar por cerrada la
feature, simulando exactamente lo que hará la app Android contra `redeem_travel_access`.

**Dependencia:** Todas las fases anteriores
([0](travel-access-fase0-rename-status.md), [1](travel-access-fase1-schema.md),
[2](travel-access-fase2-rpc.md), [3](travel-access-fase3-repository-domain.md),
[4](travel-access-fase4-store.md), [5](travel-access-fase5-ui.md)).
**Estado:** Pendiente

---

## Rol del asistente

**Modo:** Mentor / Guía de implementación
**Comportamiento:** Guiar la ejecución de cada prueba, ayudar a interpretar
resultados inesperados. El usuario corre los comandos.

---

## Base de datos / RPC (local, con `supabase start`)

1. Con un viaje `status = 'published'` y un viajero con teléfono conocido (ej.
   `8181234001` del seed), llamar `generate_travel_access_code` como owner —
   verificar que devuelve un código de 6 caracteres y que una segunda llamada revoca
   la primera.
2. Probar `redeem_travel_access` exactamente como lo hará Android:
   ```bash
   curl -s -X POST "http://127.0.0.1:54321/rest/v1/rpc/redeem_travel_access" \
     -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"p_phone":"8181234001","p_code":"AB3K9Q"}'
   ```
   Casos a validar:
   - Código correcto → 200 con el JSON completo (revisar que **nunca** aparezcan
     otros viajeros, datos de `travel_buses`/costos, `internal_notes`, ni
     `travel_access_codes`).
   - Código incorrecto → 400 `invalid_code`.
   - Teléfono con espacios/guiones/código de país → sigue matcheando.
   - Revocar el código y reintentar → `code_revoked`.
   - Poner el viaje en `pending` (ni `published` ni `in_progress`) y reintentar →
     `travel_not_eligible`.
   - 11 intentos fallidos seguidos para el mismo teléfono → el 11º devuelve
     `too_many_attempts`.
3. Confirmar que `anon` **no puede** ejecutar `generate_travel_access_code` ni
   `revoke_travel_access_code` (permission denied).
4. Confirmar que un `SELECT * FROM travelers` / `travel_access_codes` como `anon` o
   como `authenticated` no-owner sigue sin devolver nada extra (RLS no se debilitó).
5. Correr los advisors de Supabase (`get_advisors` / `supabase db advisors`) y
   resolver cualquier hallazgo nuevo.

## UI de administración (navegador)

1. `bun run dev`, entrar a un viaje con `status = 'published'`, ir a su página de
   detalle.
2. Tarjeta deshabilitada con alerta en estados no elegibles, activa en
   `published`/`in_progress`.
3. Generar código → aparece, copiar funciona, botones de WhatsApp abren la URL
   correcta.
4. Recargar → código ya no visible en texto plano (solo metadata).
5. Revocar → el código viejo falla en el `curl` del paso 2.
6. Regenerar sobre un código ya activo → modal de confirmación, el código anterior
   deja de ser válido tras confirmar.

## Verificación cruzada de código

- `bun run typecheck` sin errores en todo el proyecto.
- `bun run lint:fix` limpio.
- `grep -rn "'confirmed'"` en `app/` y `supabase/` no muestra nada relacionado a
  `travel_status` (Fase 0).
- Revisar que `use-travel-access-domain.ts` no importa Supabase ni Pinia.
- Revisar que el repositorio nunca hace `select('*')` sobre `travel_access_codes`.

---

## Cierre

Al completar esta fase, actualizar el estado en
`docs/features/pending/travel-access-code-PLAN.md` (índice de fases y estado general)
a "✅ Completada" y mover el documento principal (y esta carpeta de fases) de
`docs/features/pending/` a `docs/features/completed/`, siguiendo la convención ya
usada por otras features de este proyecto.
