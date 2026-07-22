# Feature: Código de Acceso al Viaje (consumo desde app Android)

**Objetivo:** Diseñar el esquema de base de datos y el endpoint público (RPC de
Postgres vía PostgREST) que una futura app Android usará para que un viajero, con su
teléfono + un código de 6 caracteres generado por el admin, consulte el itinerario y
detalles de su viaje — sin exponer otros viajeros ni otros viajes. Incluye también la
UI de administración para generar/mostrar/revocar ese código.

**Complejidad:** Media-Alta — 3 migraciones nuevas (rename de enum + 2 tablas + 3
RPCs `SECURITY DEFINER`), capa Repository+Domain+Store nueva, componente de UI nuevo.
**Estado:** 🚧 EN PLANIFICACIÓN

---

## Contexto

Los viajes creados en esta app web serán consumidos por una app Android (fuera de
alcance) donde los viajeros deben poder ver el itinerario/detalles de su viaje. Para
evitar exponer esa información a cualquiera, el admin, cuando un viaje está
**publicado** (el estado que antes se llamaba `confirmed` en `travel_status` — se
renombra a `published` porque es más claro: es la misma condición que ya usaba la
política RLS `anon` pensada para una futura landing page), genera manualmente un
**código de viaje** de 6 caracteres. Ese código se envía por WhatsApp/SMS a los
teléfonos de los viajeros registrados en ese viaje (envío manual, sin integración
automatizada). En la app Android, el viajero ingresa su teléfono + ese código; si
coinciden, recibe el itinerario y detalles de su viaje — nada de otros viajeros ni
otros viajes.

Nuestro alcance es **solo** el esquema de base de datos, el endpoint público que
consumirá Android, y la UI de administración para generar/mostrar/revocar el código.
No se construye la app Android ni un sistema de envío automatizado de mensajes.

### Decisiones ya confirmadas con el usuario

1. **Endpoint = RPC de Postgres expuesto vía PostgREST a `anon`**
   (`{SUPABASE_URL}/rest/v1/rpc/redeem_travel_access`), sin agregar un server Nuxt
   nuevo — el proyecto sigue siendo SPA (`ssr:false`).
2. **Sin sesión (stateless)**: cada llamada desde Android reenvía teléfono+código; el
   RPC devuelve el paquete completo del viaje en una sola respuesta.
3. **Se renombra el estado `confirmed` → `published`** en el enum `travel_status`.
   **El código de acceso aplica a viajes con `status` en `('published', 'in_progress')`**
   — así el viajero no pierde acceso al itinerario una vez que el viaje ya inició.

Este diseño fue validado contra el patrón existente `move_or_swap_traveler_seat`
(`supabase/migrations/20260426052101_traveler_seat_swap_rpc.sql` — RPC `plpgsql`,
`jsonb`, `errcode = 'P0001'`, grants explícitos a `anon`/`authenticated`/`service_role`)
y contra las políticas RLS anon existentes (`travels_anon_confirmed`,
`travel_activities_anon_select`, `travel_services_anon_select`,
`travel_media_anon_select` en `20260506230433_rls_single_admin_policies.sql`), y sigue
el patrón Repository + Domain + Store de este repo (ver
`app/composables/travelers/use-traveler-repository.ts` +
`use-traveler-domain.ts` + `app/stores/use-travel-media-store.ts` como referencias de
estilo).

---

## Rol del asistente

**Modo:** Mentor / Guía de implementación
**Comportamiento:** Explicar el *por qué* y el *cómo* de cada fase antes de que el
usuario empiece a escribir código. No implementar los archivos de la feature
directamente — el usuario escribe el código, corre las verificaciones
(`db:reset`, `db:types`, `typecheck`, `lint:fix`, pruebas manuales) y comparte los
resultados para revisión antes de avanzar a la siguiente fase.

**Skills a cargar según la fase:**
```
@.claude/skills/supabase
@.claude/skills/supabase-postgres-best-practices
@.claude/skills/vue
@.claude/skills/nuxt
@.claude/skills/nuxt-ui
@.claude/skills/pinia
@.claude/skills/vueuse-functions
```

---

## Índice de documentos por fase

| Documento | Contenido | Dependencia | Estado |
|---|---|---|---|
| [travel-access-fase0-rename-status.md](plan/travel-access-fase0-rename-status.md) | Renombrar `travel_status`: `confirmed` → `published` + código frontend afectado | Ninguna | Pendiente |
| [travel-access-fase1-schema.md](plan/travel-access-fase1-schema.md) | Tablas `travel_access_codes` + `travel_access_attempts` + `normalize_phone_last10` | Fase 0 | Pendiente |
| [travel-access-fase2-rpc.md](plan/travel-access-fase2-rpc.md) | `generate_travel_access_code`, `revoke_travel_access_code`, `redeem_travel_access` (el endpoint de Android) | Fase 1 | Pendiente |
| [travel-access-fase3-repository-domain.md](plan/travel-access-fase3-repository-domain.md) | Types + repository + domain (`travel-access`) | Fase 2 | Pendiente |
| [travel-access-fase4-store.md](plan/travel-access-fase4-store.md) | Store Pinia `use-travel-access-store.ts` | Fase 3 | Pendiente |
| [travel-access-fase5-ui.md](plan/travel-access-fase5-ui.md) | Componente `TravelAccessCodeCard` + integración en la página de detalle | Fase 4 | Pendiente |
| [travel-access-fase6-verificacion.md](plan/travel-access-fase6-verificacion.md) | Verificación end-to-end (RPC vía `curl` simulando Android + prueba manual en navegador) | Todas | Pendiente |

> Al terminar cada fase, actualizar su "Estado" en este índice y en el propio
> documento de la fase (`Pendiente` → `Completada ✅`), para poder retomar en
> cualquier sesión sin perder contexto.

---

## Estructura objetivo (global)

```
supabase/migrations/
├── <ts>_rename_travel_status_confirmed_to_published.sql   ← Fase 0
├── <ts>_travel_access_codes_schema.sql                    ← Fase 1
└── <ts>_travel_access_rpc.sql                             ← Fase 2

app/
├── types/
│   └── travel-access.ts                                   ← Fase 3
├── composables/
│   └── travel-access/
│       ├── use-travel-access-repository.ts                ← Fase 3
│       └── use-travel-access-domain.ts                    ← Fase 3
├── stores/
│   └── use-travel-access-store.ts                         ← Fase 4
├── components/
│   └── travel-access-code-card.vue                        ← Fase 5
└── pages/travels/[id]/
    └── index.vue                                           ← Fase 5 (modificado)
```

---

## Fuera de alcance (confirmado)

- La app Android en sí.
- Envío automatizado de SMS/WhatsApp (el link `wa.me` es solo una conveniencia manual
  de un clic).
- Cualquier tabla/sistema de sesión o token (decisión de "stateless" ya confirmada).
- Rate limiting por IP (no es viable a nivel de RPC/PostgREST; el throttling por
  teléfono es la mitigación práctica ya que esto protege información de itinerario,
  no pagos).
