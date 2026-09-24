# Fase 5 — Perfil completo para publicar

**Estado:** Completada ✅ (local). Trigger verificado (ver Fase 7), seed actualizado,
opción "Publicado" deshabilitada en `travel-form.vue` y error traducido en
`toTravelSaveErrorMessage` (`use-travel-domain.ts`). `new.vue` ahora maneja el fallo de
`addTravel`.
**Dependencia:** Fase 4
**Migración:** `20260924053138_require_profile_to_publish.sql`

[← Volver al plan](../../pending/agency-profile/PLAN.md)

---

## Objetivo

Que un viaje **no pueda pasar a `published`** si la agencia no completó su perfil (nombre de
empresa y estado). Sin esto, la web puede recibir viajes sin agencia identificable, que no
aparecen en ningún filtro de estado.

## Por qué se propone

Es el mismo razonamiento que hacer obligatorio el `summary` del viaje (PR #57):
corregir el dato **en origen** en lugar de agregar fallbacks en la web. Si la web tiene
que resolver "¿qué muestro cuando no hay agencia?", ese caso nunca desaparece.

## Por qué trigger y no CHECK

La condición cruza tablas (`travels` → `agency_profiles`). Un `CHECK` solo ve la fila
propia. La herramienta correcta es un trigger `BEFORE INSERT OR UPDATE OF status`.

```sql
CREATE FUNCTION private.ensure_profile_complete_on_publish()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'published'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published')
     AND NOT EXISTS (
       SELECT 1 FROM public.agency_profiles p
       WHERE p.id = NEW.owner_id
         AND p.company_name IS NOT NULL
         AND p.state_code IS NOT NULL
     ) THEN
    RAISE EXCEPTION 'agency_profile_incomplete'
      USING ERRCODE = 'P0001',
            HINT = 'Completa el nombre de empresa y el estado en tu perfil antes de publicar.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER travels_require_profile_to_publish
  BEFORE INSERT OR UPDATE OF status ON public.travels
  FOR EACH ROW EXECUTE FUNCTION private.ensure_profile_complete_on_publish();
```

- Solo se evalúa en la **transición** a `published`. Un viaje ya publicado no se rompe si
  el usuario vacía su perfil después. Eso lo cubre la UI (Fase 4 impide guardar nombre
  vacío una vez lleno).
- **Sin `SECURITY DEFINER`:** el dueño puede leer su propio perfil por RLS, que es el único
  caso en el que puede publicar.
- **Viajes ya publicados en prod:** el trigger no los toca. Hay que revisar a mano que sus
  dueños completen el perfil (ver Fase 7).

## Impacto en `seed.sql`

El seed inserta viajes del usuario de dev (`seed.sql:462`), y algunos pueden ser
`published`. Con este trigger, `db:reset` fallaría porque el perfil de dev (creado por el
trigger de alta de la Fase 2) está vacío. En esta misma fase, el seed debe hacer un
`UPDATE public.agency_profiles SET company_name = ..., state_code = ... WHERE id =
'00000000-0000-0000-0000-000000000001'` **antes** del insert de `travels`.

## UI (CRM)

- En `travel-form.vue`, al elegir estado "Publicado": si `isProfileComplete()` es falso,
  deshabilitar la opción con un aviso y un enlace a `/profile`.
- El domain de viajes traduce el error `agency_profile_incomplete` a un mensaje en español,
  por si la UI queda desincronizada (ej. perfil editado en otra pestaña).

## Verificación

- [ ] Perfil incompleto + cambiar un viaje a `published` → error `agency_profile_incomplete`
- [ ] Perfil completo + publicar → OK
- [ ] Viaje ya publicado + editar otros campos (no `status`) → no dispara el gate
- [ ] La opción "Publicado" aparece deshabilitada en el formulario, con enlace a `/profile`
