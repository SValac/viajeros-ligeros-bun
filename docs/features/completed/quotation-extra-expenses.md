# Feature: Gastos adicionales de la cotización

**Estado:** ✅ COMPLETADA en la rama `feature/quotation-extra-expenses`; migración pendiente de push a stage y prod.

---

## Contexto

Algunos costos del viaje no son de un proveedor del catálogo: publicidad, viáticos,
comisiones, box lunch… Hasta ahora no había dónde ponerlos y quedaban fuera del precio
por asiento. La cotización tiene ahora la pestaña **Gastos** (`/quotations/[id]/expenses`).

## Decisiones

- **Pestaña nueva**, junto a Proveedores, Hospedaje y Autobuses, con contador.
- **Solo costo, sin pagos**: no hay anticipos, saldo ni estado de pago. Por eso no entran
  en "Por pagar a proveedores" del resumen.
- **Categoría + descripción opcional.** La categoría es texto libre: el select sugiere
  Publicidad, Viáticos, Comisiones, Box lunch y Otro, más las que la agencia ya usó en
  cualquier cotización, y el usuario puede escribir una nueva ("Crear …"). No hay catálogo
  de categorías que administrar; una errata crea otra categoría.
- **Costo total o por persona.** Por persona se capturan costo y número de personas
  (total = costo × personas, redondeado a centavos). Las personas se prellenan con el
  divisor de "Dividir entre" y lo siguen mientras no se editen a mano: así se puede contar
  a quien lo recibe sin pagar asiento (coordinadores, choferes).
- **Siempre se reparte** entre los asientos mínimos objetivo o los vendibles, como un
  servicio de costo total. A diferencia de un servicio por persona, un gasto por persona
  no se suma directo al asiento ni se cobra por viajero.
- Con la cotización confirmada la pestaña es de solo lectura.

## Base de datos

Migración `20261008173754_quotation_expenses.sql`. Solo agrega (segura para prod).

| Pieza | Qué hace |
| --- | --- |
| `quotation_expenses` | `category`, `description`, `cost_type`, `unit_cost`, `person_count`, `total_cost`, `split_type`; borra en cascada con la cotización |
| Enums | Reusa `provider_cost_type` y `cost_split_type` |
| `CHECK`s | Categoría no vacía (≤ 40), descripción ≤ 200, total > 0; por persona lleva `unit_cost` y `person_count` (> 0), costo total ninguno |
| RLS `quotation_expenses_owner` | `quotation_expenses → quotations → travels.owner_id`, con `WITH CHECK`; `anon` sin permisos |

## Código

| Archivo | Cambio |
| --- | --- |
| `app/types/quotation.ts` | `QuotationExpense`, `QuotationExpenseFormData`; `expenses` en `QuotationFetchResult` |
| `app/utils/mappers.ts` | `mapQuotationExpenseRowToDomain`, `mapQuotationExpenseToRow` |
| `app/composables/quotation/use-quotation-repository.ts` | Carga los gastos con la cotización; `insertExpense`, `updateExpense`, `deleteExpense`, `fetchExpenseCategories` |
| `app/composables/quotation/use-quotation-domain.ts` | `calculateSeatPrice` suma los gastos a su reparto (mínimo o vendibles) |
| `app/stores/use-cotizacion-store.ts` | Estado `gastosAdicionales` y `categoriasGasto`; getters `getGastosByQuotation`, `getTotalGastos`, `getGastosTipoMinimo/Total`; acciones `addGasto`, `updateGasto`, `deleteGasto` (recalculan el precio por asiento), `fetchCategoriasGasto`. Ganancia proyectada y asiento con ganancia cuentan los gastos |
| `app/components/cotizacion-gasto-form.vue` | Form: categoría creable (`USelectMenu` con `create-item`), tipo de costo, personas que siguen al divisor, aviso con lo que suma al asiento |
| `app/components/cotizacion-gastos-section.vue` | Tabla con costo total, "por asiento" y totales; modales de form y de eliminar |
| `app/pages/quotations/[id]/expenses.vue`, `app/pages/quotations/[id].vue` | Ruta `quotation-expenses` y pestaña "Gastos" |
| `app/components/cotizacion-resumen-financiero.vue` | KPI "Gastos adicionales"; el costo total y los repartos del precio por asiento los incluyen |

## Verificación (local)

- Publicidad $2,000 total ÷ 20 mínimos → +$100 por asiento (precio $1,524 → $1,624).
- Categoría nueva "Propinas" por persona $50; al cambiar a asientos vendibles las personas
  pasan de 20 a 43; editadas a 45 → $2,250 ÷ 43 = +$52.33 (precio $1,676). Al editarlo
  se conservan las 45 y "Propinas" aparece como sugerencia.
- Resumen: costo total $69,750 (servicios + autobuses + gastos), repartos y ganancia
  proyectada (43 × $1,676 − $69,750 = $2,318) cuadran.
- Eliminar el gasto regresa el precio a $1,624.
- RLS: `anon` recibe *permission denied*; otro dueño ve 0 filas.
