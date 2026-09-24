# Fase 6 — Contrato con la web pública

**Estado:** ✅ Lado CRM completo: el contrato de datos está en stage y prod, y el embed se
probó como `anon` contra la API local. La web lo implementó en `viajeros-ligeros-web`, rama
`feat/agency-profile` (reporte de la sesión web, 2026-09-24): embed, `Trip.agency`, filtro
por estado (visible solo con más de un estado), logo/nombre/estado en la tarjeta y en la de
reserva, y WhatsApp con el teléfono de la agencia. **Seguimiento en el repo web:** probar
contra stage y mergear a `main`, siempre después del PR del CRM.
**Dependencia:** Fase 2 (desplegada al menos en stage)
**Repo:** `viajeros-ligeros-web`. La implementa la sesión paralela de ese repo; coordinar
por `SendMessage` ([[reference_web_repo_peer_session]]).

[← Volver al plan](PLAN.md)

---

## Objetivo

Que cada viaje llegue a la web con los datos de su agencia, y que la web permita filtrar
por estado y muestre el branding de la agencia.

## Contrato de datos

Agregar al `TRIP_SELECT` de `app/lib/trips-supabase.ts`:

```ts
agency_profiles (
  company_name,
  phone,
  logo_url,
  primary_color,
  secondary_color,
  country_code,
  state_code,
  country_states ( name )
)
```

- Relación **muchos a uno** (`travels.owner_id → agency_profiles.id`): PostgREST la devuelve
  como **objeto**, no como arreglo.
- `country_states ( name )` se resuelve por el FK compuesto `(country_code, state_code)`.
  Devuelve `null` si el estado está vacío.
- Todas las columnas pueden ser `null` (perfil incompleto), salvo `country_code`.

Tipo sugerido en la web:

```ts
type AgencyRow = {
  company_name: string | null;
  phone: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  country_code: string;
  state_code: string | null;
  country_states: { name: string } | null;
};
```

Mapeo a `Trip.agency` en `mapTravelToTrip`:
`{ name, phone, logoUrl, colors: { primary, secondary }, stateCode, stateName }`.

## Filtro por estado

- `TripFilters` gana `state: string | null` (código ISO, ej. `'JAL'`).
- Opciones del selector: **solo los estados que tienen viajes**, derivados de los viajes
  cargados. Así no aparecen 32 estados, 30 de ellos vacíos. No hace falta consultar
  `country_states` aparte.
- El filtro es del lado del cliente, igual que los actuales en `use-trips.ts`.
- Si más adelante el volumen de viajes obliga a filtrar en el servidor, el embed admite
  `agency_profiles!inner(state_code)` con `.eq('agency_profiles.state_code', 'JAL')`.

## Branding

- Tarjeta y detalle del viaje: logo y nombre de la agencia; color primario como acento
  (borde o badge), **con fallback al color del sitio** si es `null`.
- Contraste: un color de agencia muy claro sobre fondo blanco puede quedar ilegible. La
  web debe elegir el color de texto encima según luminancia (negro o blanco), no asumir
  blanco.
- Teléfono: botón de WhatsApp `https://wa.me/{phone sin '+'}` cuando exista.

## Checklist de coordinación

- [ ] Avisar a la sesión web cuando la Fase 2 esté en stage, con este documento como
      contrato
- [ ] La web se prueba contra el Preview de stage (Supabase `wfmpttxmztlniiqvkrcl`)
- [ ] Orden de despliegue a prod: **migración primero, web después**. Si la web sale antes,
      el embed a una relación inexistente hace fallar **toda** la consulta de viajes
