# Refactor: use-payment-store

**Objetivo:** Aplicar el patrón Repository + Domain composables al store de pagos.
El store queda como orquestador de estado/cache; la lógica de cálculo financiero
va al dominio; el acceso a Supabase va al repositorio. Sin cambios en la API pública.

**Patrón elegido:** Repository + Domain composables  
**Complejidad:** Media-alta — 2 tablas (`payments` + `traveler_account_configs`),
lógica de cálculo financiero (descuentos, recargos, saldo), validación de pagos  
**Estado:** Pendiente

---

## Rol del asistente

**Modo:** Mentor / Guía de implementación  
**Comportamiento:** Explicar el *por qué* de cada cambio antes de que el usuario
escriba código. No realizar cambios al código a menos que el usuario lo pida
explícitamente. Responder preguntas y adaptar las explicaciones al nivel del usuario.

**Skills a cargar al inicio de la sesión:**

```
@.claude/skills/vue
@.claude/skills/vue-best-practices
@.claude/skills/nuxt
@.claude/skills/pinia
@.claude/skills/supabase
```

**Contexto de referencia:**
- Store ya refactorizado: `app/stores/use-traveler-store.ts`
- Repositorio de referencia: `app/composables/travelers/use-traveler-repository.ts`
- Dominio de referencia: `app/composables/travelers/use-traveler-domain.ts`
- Plan de referencia completado: `docs/features/pending/plan/refactor-use-traveler-store.md`

---

## Análisis del store actual

**Archivo:** `app/stores/use-payment-store.ts` (388 líneas)  
**Tablas:** `payments` + `traveler_account_configs` (upsert con PK compuesta)

### Lógica de dominio a extraer (Fase 1)

Este store tiene la lógica de dominio más rica del proyecto:

| Función a crear | Origen en store |
|---|---|
| `calcAdjustmentAmount(item, base): number` | función privada inline en `getTravelerPaymentSummary` y `addPayment` |
| `calculatePaymentSummary(config, travelPrice, travelerPayments): PaymentCalculation` | lógica de `getTravelerPaymentSummary` computed (líneas 72-122) |
| `validatePaymentAmount(amount, balance, appliedPrice): string \| null` | validación en `addPayment` (líneas 212-242) |
| `getPaymentStatus(totalPaid, finalCost): PaymentStatus` | lógica de status inline en `getTravelerPaymentSummary` |

**Por qué es importante extraer esto:**
- `getTravelerPaymentSummary` y `addPayment` comparten la misma lógica de cálculo
  (descuentos, recargos, costo final) — actualmente está **duplicada** en el store.
- El dominio consolida esa lógica en un solo lugar: si cambian las reglas de cálculo,
  se edita una sola función.

**Nuevo tipo sugerido para el dominio:**
```ts
type PaymentCalculation = {
  appliedPrice: number;
  totalDiscountAmount: number;
  totalSurchargeAmount: number;
  finalCost: number;
  balance: number;
  status: PaymentStatus;
}
```

### Acciones con Supabase a mover al repositorio (Fase 2)

| Acción en store | Función en repositorio |
|---|---|
| `fetchByTravel` (payments) | `fetchPaymentsByTravel(travelId): Promise<Payment[]>` |
| `fetchByTravel` (configs) | `fetchConfigsByTravel(travelId): Promise<TravelerAccountConfig[]>` |
| `fetchByTraveler` (payments) | `fetchPaymentsByTraveler(travelerId): Promise<Payment[]>` |
| `fetchByTraveler` (configs) | `fetchConfigsByTraveler(travelerId): Promise<TravelerAccountConfig[]>` |
| `addPayment` | `insertPayment(data: PaymentFormData): Promise<Payment>` |
| `updatePayment` | `updatePayment(id, data): Promise<Payment>` |
| `deletePayment` | `removePayment(id): Promise<void>` |
| `setAccountConfig` | `upsertAccountConfig(config): Promise<void>` |

**Nota:** `fetchByTravel` y `fetchByTraveler` cada uno carga DOS tablas en paralelo.
En el repositorio pueden ser funciones separadas (más composables) o una función
que retorne ambos arrays. Se recomienda separadas para mayor flexibilidad.

---

## Estructura objetivo

```
app/
├── composables/
│   └── payments/
│       ├── use-payment-domain.ts      ← lógica de cálculo financiero (NUEVO)
│       └── use-payment-repository.ts  ← acceso Supabase (NUEVO)
├── stores/
│   └── use-payment-store.ts           ← orquestación + cache (MODIFICADO)
└── types/
    └── payment.ts                     ← agregar tipo PaymentCalculation (si no existe)
```

---

## Fase 1 — Extraer lógica de dominio pura ✅ PENDIENTE

> **Criterio de éxito:** `getTravelerPaymentSummary` y `addPayment` delegan
> los cálculos al dominio. La lógica de cálculo existe en un solo lugar.

### Pasos

**1.1** Crear `app/composables/payments/use-payment-domain.ts` con:

```ts
export function calcAdjustmentAmount(item: AdjustmentItem, base: number): number {
  return item.type === 'percentage' ? base * item.amount / 100 : item.amount;
}

export function getPaymentStatus(totalPaid: number, finalCost: number): PaymentStatus {
  if (totalPaid <= 0) return 'pending';
  if (totalPaid >= finalCost) return 'paid';
  return 'partial';
}

export function calculatePaymentSummary(
  config: TravelerAccountConfig | undefined,
  travelPrice: number,
  travelerPayments: Payment[],
): PaymentCalculation {
  // lógica extraída del computed getTravelerPaymentSummary
}

export function validatePaymentAmount(
  amount: number,
  balance: number,
  appliedPrice: number,
): string | null {
  // retorna null si válido, o mensaje de error
}
```

**1.2** Actualizar `app/stores/use-payment-store.ts`:
- Importar las funciones del dominio.
- En `getTravelerPaymentSummary`: reemplazar el cuerpo de la función por una llamada
  a `calculatePaymentSummary` y ensamblar el objeto `TravelerPaymentSummary`.
- En `addPayment`: reemplazar la validación por `validatePaymentAmount`.
- Eliminar la función `calcAmount` privada (ahora es `calcAdjustmentAmount` del dominio).

**1.3** Verificación: `bun run typecheck` + `bun run lint:fix`.

---

## Fase 2 — Extraer acceso a Supabase al repositorio ✅ PENDIENTE

> **Criterio de éxito:** store sin ninguna referencia directa a `supabase.from`.

### Pasos

**2.1** Crear `app/composables/payments/use-payment-repository.ts`:

```ts
export function usePaymentRepository() {
  const supabase = useSupabase();

  async function fetchPaymentsByTravel(travelId: string): Promise<Payment[]>
  async function fetchPaymentsByTraveler(travelerId: string): Promise<Payment[]>
  async function fetchConfigsByTravel(travelId: string): Promise<TravelerAccountConfig[]>
  async function fetchConfigsByTraveler(travelerId: string): Promise<TravelerAccountConfig[]>
  async function insertPayment(data: PaymentFormData): Promise<Payment>
  async function updatePayment(id: string, data: PaymentUpdateData): Promise<Payment>
  async function removePayment(id: string): Promise<void>
  async function upsertAccountConfig(config: TravelerAccountConfig): Promise<void>

  return { fetchPaymentsByTravel, fetchPaymentsByTraveler, fetchConfigsByTravel,
           fetchConfigsByTraveler, insertPayment, updatePayment, removePayment,
           upsertAccountConfig }
}
```

**Nota sobre `upsertAccountConfig`:** Usa `onConflict: 'travel_id,traveler_id'`
(PK compuesta) — este detalle va en el repositorio.

**2.2** Actualizar `app/stores/use-payment-store.ts`:
- Agregar `const repository = usePaymentRepository()`.
- En `fetchByTravel`: cargar payments y configs en paralelo con `Promise.all`:
  ```ts
  const [fetchedPayments, fetchedConfigs] = await Promise.all([
    repository.fetchPaymentsByTravel(travelId),
    repository.fetchConfigsByTravel(travelId),
  ]);
  ```
- Hacer lo mismo en `fetchByTraveler`.
- Reemplazar el resto de bloques Supabase por llamadas al repositorio.
- Eliminar `const supabase = useSupabase()` y el import de `TablesUpdate`.

**Nota sobre `addPayment`:** Primero valida (dominio), luego inserta (repositorio).
La validación puede usar datos del cache del store sin tocar el repositorio.

**2.3** Verificación:
- `bun run typecheck` sin errores.
- `bun run lint:fix` limpio.
- Prueba manual: agregar pago, editar, borrar, configurar cuenta de viajero.
- Verificar que el resumen financiero (`getTravelerPaymentSummary`) sigue calculando correctamente.
- Verificar la validación de monto máximo en `addPayment`.

---

## Fase 3 — Limpieza final ✅ PENDIENTE

**3.1** Confirmar que la lógica de cálculo financiero está **solo** en el dominio
(no duplicada entre `getTravelerPaymentSummary` y `addPayment`).

**3.2** Revisar `use-payment-domain.ts`: solo funciones puras, sin Supabase.

**3.3** Revisar `use-payment-repository.ts`: solo async I/O, sin estado reactivo.

**3.4** Verificación final: `bun run typecheck` + `bun run lint:fix`.

---

## Decisiones de diseño

| Decisión | Justificación |
|---|---|
| Lógica de cálculo en dominio | Estaba duplicada entre `getTravelerPaymentSummary` y `addPayment` — consolidar elimina el riesgo de divergencia |
| `fetchByTravel` carga 2 tablas en paralelo | `Promise.all` en el store, repositorio expone 4 funciones separadas — más componibles |
| `upsertAccountConfig` en repositorio | El `onConflict: 'travel_id,traveler_id'` es detalle de Supabase — no debe estar en el store |
| Validación de pago en dominio | Es regla de negocio pura: "no puedes pagar más de lo que debes" |
