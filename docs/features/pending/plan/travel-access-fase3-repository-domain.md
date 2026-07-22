# Código de Acceso al Viaje — Fase 3: Types + Repository + Domain

**Objetivo:** Crear la capa de datos frontend para el código de acceso, siguiendo el
patrón Repository + Domain ya establecido en el proyecto.

**Dependencia:** [Fase 2](travel-access-fase2-rpc.md) — necesita los 3 RPCs ya
desplegados localmente y `bun run db:types` ya corrido (los tipos de
`travel_access_codes` deben existir en `database.types.ts`).
**Estado:** Pendiente

---

## Rol del asistente

**Modo:** Mentor / Guía de implementación
**Comportamiento:** Explicar el *por qué* antes de cada paso. No escribir código
a menos que el usuario lo pida explícitamente. El usuario escribe el código y corre
`bun run typecheck` después de cada archivo.

**Referencias de estilo a mirar antes de escribir:**
- `app/composables/travelers/use-traveler-repository.ts` — repositorio simple + llamada a RPC (`changeSeat`)
- `app/composables/travelers/use-traveler-domain.ts` — `toTravelerSeatChangeError` (mapeo de errores de RPC), `TravelerSeatChangeError` (clase de error tipada en `~/types/traveler.ts`)
- `app/composables/travels/use-travel-repository.ts` — estilo general del repositorio (una función = una query, mapea a domain, lanza en error)

---

## Estructura objetivo

```
app/
├── types/
│   └── travel-access.ts                              ← NUEVO
└── composables/
    └── travel-access/
        ├── use-travel-access-repository.ts            ← NUEVO
        └── use-travel-access-domain.ts                ← NUEVO
```

---

## 3.1 — `app/types/travel-access.ts`

```ts
export type TravelAccessCode = {
  id: string;
  travelId: string;
  expiresAt: string;
  revokedAt: string | null;
  createdBy: string;
  createdAt: string;
};

export type TravelAccessCodeGenerated = TravelAccessCode & { code: string };

export type TravelAccessCodeErrorCode
  = | 'not-authorized' | 'travel-not-eligible' | 'travel-not-found'
    | 'no-active-code' | 'code-generation-conflict' | 'unknown-error';

export class TravelAccessCodeError extends Error {
  code: TravelAccessCodeErrorCode;
  constructor(code: TravelAccessCodeErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.code = code;
  }
}
```

---

## 3.2 — `app/composables/travel-access/use-travel-access-repository.ts`

Tres funciones, cada una una sola operación Supabase:

- `fetchActiveCode(travelId): Promise<TravelAccessCode | null>` — `select('id, travel_id, expires_at, revoked_at, created_by, created_at')`
  (⚠️ **nunca** `select('*')` — `code_hash` no debe llegar al browser aunque la policy
  lo permitiera) `.eq('travel_id', travelId).is('revoked_at', null).maybeSingle()`.
- `generate(travelId): Promise<TravelAccessCodeGenerated>` →
  `supabase.rpc('generate_travel_access_code', { p_travel_id: travelId })`.
- `revoke(travelId): Promise<void>` →
  `supabase.rpc('revoke_travel_access_code', { p_travel_id: travelId })`.

Mismo patrón que el resto de repositorios: usa `useSupabase()`, no toca estado
reactivo, lanza en error (`if (error) throw error`).

---

## 3.3 — `app/composables/travel-access/use-travel-access-domain.ts`

- `mapTravelAccessCodeRowToDomain(row)` / `mapGeneratedRpcResultToDomain(data)` —
  mappers snake_case → camelCase, mismo estilo que los mappers de
  `use-traveler-domain.ts`.
- `toTravelAccessCodeError(error: unknown): TravelAccessCodeError` — mapea los
  mensajes de error del RPC (`not_authorized`, `travel_not_eligible`,
  `travel_not_found`, `no_active_code`, `code_generation_conflict`) a la clase
  tipada, igual patrón que `toTravelerSeatChangeError`.
- `buildWhatsAppShareUrl(phone: string, code: string, travelLabel: string): string` —
  normaliza el teléfono (quita todo lo que no sea dígito; si quedan 10 dígitos,
  antepone `DEFAULT_COUNTRY_CODE = '52'` como constante documentada — asunción
  específica de México; si no, se usa tal cual asumiendo que ya trae código de país),
  construye un mensaje tipo
  `Tu código de acceso para "${travelLabel}" es: ${code}. Ingrésalo en la app junto
  con tu número de teléfono.`, y devuelve
  `https://wa.me/<digits>?text=${encodeURIComponent(message)}`.

---

## Pasos de implementación

**3.1** Crear `app/types/travel-access.ts` con el contenido de la sección 3.1.

**3.2** Crear `use-travel-access-repository.ts` con las 3 funciones de la sección 3.2.

**3.3** Crear `use-travel-access-domain.ts` con los mappers, `toTravelAccessCodeError`
y `buildWhatsAppShareUrl` de la sección 3.3.

**3.4** `bun run typecheck` sin errores.

---

## Verificación

- `use-travel-access-domain.ts` no importa Supabase ni Pinia (dominio puro).
- El repositorio nunca hace `select('*')` sobre `travel_access_codes`.
- Prueba manual rápida desde la consola del navegador (o un script temporal) llamando
  `useTravelAccessRepository().generate(travelId)` sobre un viaje `published` propio —
  debe devolver un código de 6 caracteres.
