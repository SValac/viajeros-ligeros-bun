# Fase 3 — Bucket de logos

**Estado:** Completada ✅ (en stage y prod desde el 2026-09-24). La migración aplica en `db:reset`. Las pruebas de
escritura cruzada entre usuarios se hacen en la Fase 7 (o desde la página de la Fase 4).
Las 4 policies existentes sobre `storage.objects` filtran por `bucket_id = 'travel-gallery'`,
así que ninguna da acceso al bucket nuevo.
**Dependencia:** Fase 2
**Migración:** `20260924043319_agency_logos_storage.sql`

[← Volver al plan](PLAN.md)

---

## Objetivo

Un bucket público `agency-logos` donde cada usuario solo puede escribir dentro de su propia
carpeta, y la web lee por URL pública.

## Por qué un bucket aparte y no `travel-gallery`

Las policies de `travel-gallery` (`20260614234026_multitenant_storage_rls.sql`) validan que
el **primer segmento del path sea un `travel_id`** del usuario. Un logo no pertenece a un
viaje. Meterlo ahí obligaría a una excepción en esa policy. Un bucket propio con límites
propios (tamaño, tipos) es más simple y no toca nada existente.

## Convención de path

```
agency-logos/{user_id}/logo-{timestamp}.{ext}
```

- `{user_id}` como primer segmento es lo que valida la policy.
- `{timestamp}` en el nombre: la URL pública pasa por CDN. Si siempre fuera `logo.png`, al
  reemplazarlo la web seguiría mostrando el viejo hasta que expire la caché. Con nombre
  nuevo, la URL cambia y la caché no afecta.
- Al subir un logo nuevo, el CRM borra el anterior (Fase 4). Así la carpeta no acumula
  archivos huérfanos.

## Migración

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agency-logos',
  'agency-logos',
  true,
  2097152,                                          -- 2 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "agency_logos_owner_all" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'agency-logos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'agency-logos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "agency_logos_anon_select" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'agency-logos');
```

- **Sin SVG a propósito:** un SVG puede llevar `<script>`, y en un bucket público quedaría
  servido tal cual. PNG, JPEG y WebP cubren cualquier logo.
- `FOR ALL` incluye `SELECT` + `INSERT` + `UPDATE`, necesarios para `upsert` (misma nota
  que en `travel-gallery`).
- Un coordinador es `authenticated`, pero su `uid` no coincide con la carpeta de ninguna
  agencia, así que no puede escribir. Si subiera algo a su propia carpeta, sería inofensivo
  y sin uso.

## Verificación

- [ ] Usuario A sube a `{A}/logo-1.png` → OK
- [ ] Usuario A intenta subir a `{B}/logo-1.png` → rechazado
- [ ] Usuario A intenta borrar `{B}/...` → 0 objetos borrados
- [ ] Subir un `.svg` o un archivo > 2 MB → rechazado por el bucket
- [ ] La URL pública del logo abre sin sesión
