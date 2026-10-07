# Feature: Teléfonos con código de país (E.164)

**Estado:** 🚧 En desarrollo. Rama `feature/phone-input`. Falta `db:push` en stage y prod.

---

## Contexto

Los teléfonos eran texto libre, así que el mismo número aparecía como `3121273023`,
`+52 312 127 3023` o `312-127-3023`. Sin el código de país, el link `wa.me` del sitio
público apunta a otro número. Solo el perfil de agencia guardaba E.164.

## Decisiones

- **Se guarda en E.164** (`+523121273023`) y **se muestra formateado**: `(312) 127 3023`.
  Si el país no es el de por defecto, se antepone `+código`.
- **Módulo propio por país** en lugar de `libphonenumber-js`: hoy solo hay México. Para
  agregar un país basta con sumar una entrada a `PHONE_COUNTRIES` (código, lada, dígitos y
  formato). La librería pesa 80-140 KB y su formato para México no lleva paréntesis.
- El campo acepta que se escriba o pegue **con código** (`+52 312…`) o con el **prefijo móvil
  viejo** (`52 1 312…`, en México ninguna lada empieza con 1) y lo quita.
- Los **registros viejos** se leen en cualquier formato. Al guardar su formulario quedan en
  E.164 aunque no se toque el teléfono, y la migración convierte los existentes.
- Validación: el número debe tener los dígitos que pide su país (10 en México).

## Base de datos

Migración `20261007034513_normalize_phones_e164.sql`. **Solo actualiza datos**, sin cambiar
columnas (segura para prod).

| Formato guardado | Resultado |
| --- | --- |
| 10 dígitos sin `+` (`312-127-3023`, `(312) 127 3023`) | `+52` + 10 dígitos |
| `52` + 10 dígitos, con o sin `+` | `+52` + 10 dígitos |
| `52 1` + 10 dígitos | `+52` + 10 dígitos |
| Cualquier otro (otro país, dígitos de más o de menos) | Sin cambio |

Columnas: `coordinators.phone`, `travelers.phone`, `providers.contact_phone`,
`agency_profiles.phone`, `travel_buses.operator1_phone` / `operator2_phone`. Coordinadores
van primero porque `coordinators_sync_travelers` copia su teléfono a sus filas de
`travelers`. Es reversible quitando el `+52`. El acceso de viajeros
(`normalize_phone_last10`) compara los últimos 10 dígitos y no cambia.

## Código

| Archivo | Cambio |
| --- | --- |
| `app/utils/phone.ts` | `PHONE_COUNTRIES`, `parsePhone`, `normalizePhone`, `isValidPhone`, `formatPhone`, `extractNationalDigits`, `toE164` |
| `app/components/phone-input.vue` | Select de código + número formateado al escribir; `v-model` en E.164. `aria-label` para cuando no está en un `UFormField` |
| `app/utils/form-validation.ts` | `phoneSchema({ required })` valida la longitud del país; se quitan `PHONE_REGEX` y `sanitizePhone` |
| Formularios de viajero, coordinador, proveedor, perfil de agencia y operadores de autobús | Usan `<PhoneInput>` |
| `app/composables/agency-profile/use-agency-profile-domain.ts` | Sus helpers solo-MX se reemplazan por los compartidos |
| Coordinadores, proveedores, código de acceso, selector de coordinadores | Muestran `formatPhone(...)`; la búsqueda de coordinadores compara dígitos |

## Notas de implementación

- `useFormField` de Nuxt UI: un control con `id` propio **reemplaza** el id del
  `UFormField`. El select y el número llevan cada uno su `useId()`; el número va después,
  así que el `<label>` apunta a él.
- `<PhoneInput>` importa `~/utils/phone` explícito: un export nuevo en un util auto-importado
  no existe en `nuxt dev` hasta reiniciarlo.
