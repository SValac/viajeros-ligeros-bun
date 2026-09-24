# Fase 1 — Catálogo de ubicaciones

**Estado:** Completada ✅ (local) — pendiente de push a stage/prod junto con el resto
**Dependencia:** ninguna
**Migración:** `20260924015331_location_catalog.sql`

[← Volver al plan](../../pending/agency-profile/PLAN.md)

---

## Objetivo

Crear el catálogo de países y estados que usan `agency_profiles` (Fase 2) y el filtro de la
web (Fase 6). Solo México por ahora, con los códigos ISO estándar para que el catálogo se
pueda ampliar sin migrar datos.

## Por qué tablas y no un enum de Postgres

- Agregar un país es un `INSERT`, no un `ALTER TYPE` que exige migración y regenerar tipos.
- El **nombre visible** ("Ciudad de México") vive junto al código, y la web lo obtiene en el
  mismo embed en lugar de mantener un mapa código→nombre duplicado en dos repos.
- Un FK compuesto `(country_code, state_code)` garantiza que el estado pertenece al país.
  Con un enum de estados, "JAL" sería válido con cualquier país.

## Esquema

```sql
CREATE TABLE public.countries (
  code text PRIMARY KEY CHECK (code ~ '^[A-Z]{2}$'),          -- ISO 3166-1 alpha-2
  name text NOT NULL
);

CREATE TABLE public.country_states (
  country_code text NOT NULL REFERENCES public.countries (code),
  code text NOT NULL CHECK (code ~ '^[A-Z]{2,3}$'),           -- ISO 3166-2 sin prefijo (ej. 'JAL')
  name text NOT NULL,
  PRIMARY KEY (country_code, code)
);
```

- **`text` + `CHECK`, no `char(2)`** (`schema-data-types`): `char(n)` rellena con espacios y
  tiene reglas de comparación propias. `text` con un `CHECK` de formato expresa lo mismo sin
  esas sorpresas y garantiza mayúsculas.
- **FK `country_code` sin índice propio:** es la primera columna de la PK compuesta, y ese
  índice ya lo cubre (`schema-foreign-key-indexes`).

## Semilla (en la migración, no en `seed.sql`)

`seed.sql` solo corre con `db reset` local, y stage/prod necesitan el catálogo.

`countries`: `('MX', 'México')`

`country_states` (32 entidades, ISO 3166-2:MX):

| Código | Nombre | Código | Nombre |
|---|---|---|---|
| AGU | Aguascalientes | MOR | Morelos |
| BCN | Baja California | NAY | Nayarit |
| BCS | Baja California Sur | NLE | Nuevo León |
| CAM | Campeche | OAX | Oaxaca |
| CHP | Chiapas | PUE | Puebla |
| CHH | Chihuahua | QUE | Querétaro |
| CMX | Ciudad de México | ROO | Quintana Roo |
| COA | Coahuila | SLP | San Luis Potosí |
| COL | Colima | SIN | Sinaloa |
| DUR | Durango | SON | Sonora |
| GUA | Guanajuato | TAB | Tabasco |
| GRO | Guerrero | TAM | Tamaulipas |
| HID | Hidalgo | TLA | Tlaxcala |
| JAL | Jalisco | VER | Veracruz |
| MEX | Estado de México | YUC | Yucatán |
| MIC | Michoacán | ZAC | Zacatecas |

## RLS y grants

Datos de referencia, lectura para todos, escritura para nadie desde la API (se modifican
por migración).

```sql
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "countries_read_all" ON public.countries
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "country_states_read_all" ON public.country_states
  FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.countries, public.country_states TO anon, authenticated;
GRANT ALL ON public.countries, public.country_states TO service_role;
```

> Recordatorio del patrón del repo: sin `GRANT` explícito, Supabase local deja la tabla sin
> `SELECT` para `anon`/`authenticated` aunque exista la policy.

## Verificación

- [ ] `bun run db:reset` sin errores
- [ ] `select count(*) from country_states where country_code = 'MX'` → 32
- [ ] Como `anon`: `GET /rest/v1/country_states?select=code,name` devuelve las 32 filas
- [ ] Como `anon`: un `INSERT` en `countries` falla por RLS
- [ ] `bun run db:types`
