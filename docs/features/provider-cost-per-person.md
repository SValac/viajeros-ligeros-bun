# Feature: Costo de servicio total o por persona

**Estado:** 🚧 EN DESARROLLO. Rama `feature/provider-cost-per-person`.

---

## Contexto

En la pestaña **Servicios** de una cotización (`/quotations/[id]/services`) el formulario de
proveedor solo aceptaba **Costo Total**. Muchos proveedores cotizan por persona y el usuario
tenía que hacer la multiplicación a mano.

## Decisiones

- El formulario tiene **Tipo de costo**: "Costo total" o "Costo por persona".
- Por persona se capturan **Costo por persona** y **Número de personas**; la app calcula
  `total_cost = costo × personas`, redondeado a centavos.
- **Número de personas** se prellena con el divisor de **Dividir entre**: asientos mínimos
  objetivo o asientos vendibles (los mismos que usa `getCostoPerPersonaProveedor`). Sigue al
  divisor mientras el usuario no lo edite a mano.
- Se **guarda en BD** cómo se capturó el costo, para que al editar vuelva a mostrarse por
  persona.
- `total_cost` sigue siendo la fuente de verdad para pagos, saldo pendiente, precio por
  asiento y resumen financiero. **No se recalcula solo** si después cambian los asientos: la
  tabla muestra un aviso cuando las personas guardadas no coinciden con el divisor actual, y
  el usuario decide si edita el servicio.

## Base de datos

Migración `20261007013258_provider_cost_per_person.sql`. Solo agrega cosas (segura para prod).

| Pieza | Qué hace |
| --- | --- |
| `provider_cost_type` (`'total'`, `'per_person'`) | Enum nuevo |
| `quotation_providers.cost_type` | `NOT NULL DEFAULT 'total'`: las filas existentes quedan como costo total |
| `quotation_providers.unit_cost`, `person_count` | Precio por persona y personas; `NULL` en costo total |
| `CHECK quotation_providers_cost_type_fields_check` | Por persona lleva ambos (> 0); costo total no lleva ninguno |

## Código

| Archivo | Cambio |
| --- | --- |
| `app/types/quotation.ts` | `ProviderCostType`; `costType`, `unitCost`, `personCount` en `QuotationProvider` |
| `app/utils/mappers.ts` | `mapProviderCostFields`: las tres columnas van juntas, `NULL` en costo total |
| `app/composables/quotation/use-quotation-repository.ts` | `updateProvider` escribe las columnas de costo |
| `app/composables/quotation/use-quotation-domain.ts` | `calculateProviderTotalCost` (redondeo a centavos) |
| `app/stores/use-cotizacion-store.ts` | `getDivisorCosto(quotationId, splitType)`, reutilizado por `getCostoPerPersonaProveedor`, el form y la tabla |
| `app/components/cotizacion-proveedor-form.vue` | Selector de tipo de costo, schema `discriminatedUnion` por `costType`, total calculado en vivo; los `name` de los campos ahora coinciden con el schema para que se vean los errores |
| `app/components/cotizacion-proveedor-tabla.vue` | "$X × N pers." bajo el total y aviso si N ≠ divisor actual |

## Verificación (local)

- Por persona $199.99 × 20 (prellenado) → total $5,999.70 sin errores de punto flotante.
- Cambiar "Dividir entre" re-prellena personas (20 → 44) si no se tocaron; si se editaron a
  mano (30), se respetan.
- Editar un servicio por persona lo abre en ese modo con sus valores.
- Pasar a "Costo total" prellena el total calculado; al guardar, `unit_cost`/`person_count`
  quedan `NULL`.
- Costo por persona vacío muestra "Ingresa un costo válido".
