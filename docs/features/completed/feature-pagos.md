# Feature: Módulo de Pagos

## Estado: ✅ COMPLETADA

**Fecha de inicio**: 2026-03-24
**Fecha de completación**: 2026-03-24
**Branch**: `feature/payment-module`

---

## 🎯 Contexto

El sistema cuenta con un módulo de viajes y un módulo de viajeros. Los clientes pueden registrarse a un viaje, el cual tiene un costo por asiento de autobús. No existía ningún mecanismo para registrar ni dar seguimiento a los pagos realizados por los viajeros inscritos en un viaje.

---

## 🚀 Objetivo

Implementar un módulo de pagos que permita registrar los abonos realizados por los viajeros inscritos en un viaje, controlar el saldo pendiente, aplicar descuentos opcionales, distinguir entre tarifas de adulto y niño, y consultar el historial completo de pagos de cada viajero.

---

## 📌 Requerimientos Funcionales

### 1. Módulo / Navegación

- ✅ Sección **Pagos** en el menú principal del dashboard
- ✅ Acceso rápido a pagos desde el detalle de un viaje (botón "Ver Pagos")
- ✅ Acceso rápido a pagos desde el perfil del viajero (acción en dropdown)

### 2. Gestión Principal (CRUD)

- ✅ Registrar un nuevo pago (abono o pago total) para un viajero inscrito en un viaje
- ✅ Consultar el listado de pagos de un viaje
- ✅ Consultar el historial de pagos de un viajero
- ✅ Editar un pago registrado
- ✅ Eliminar un pago (con confirmación)

---

## 2. ARQUITECTURA DE DATOS

### Tipos (`app/types/payment.ts`)

```typescript
type PaymentType = 'cash' | 'transfer';
type TravelerType = 'adult' | 'child';
type PaymentStatus = 'pending' | 'partial' | 'paid';
type DiscountType = 'fixed' | 'percentage';

type Payment = {
  id: string;
  travelId: string;
  travelerId: string;
  amount: number;
  paymentDate: string;
  paymentType: PaymentType;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

type PaymentFormData = Omit<Payment, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
type PaymentUpdateData = Partial<PaymentFormData>;

type TravelerAccountConfig = {
  travelId: string;
  travelerId: string;
  travelerType: TravelerType;
  childPrice?: number;
  discount?: number;
  discountType?: DiscountType;
};

type TravelerPaymentSummary = {
  travelId: string;
  travelerId: string;
  totalCost: number;
  travelerType: TravelerType;
  appliedPrice: number;
  discount: number;
  discountType: DiscountType;
  finalCost: number;
  totalPaid: number;
  balance: number;
  status: PaymentStatus;
};

type PaymentFilters = {
  travelId?: string;
  travelerId?: string;
  status?: PaymentStatus;
  paymentType?: PaymentType;
  travelerType?: TravelerType;
  dateFrom?: string;
  dateTo?: string;
};
```

### Relaciones

```
Travel (1) ──────── (N) Payment
Traveler (1) ─────── (N) Payment
Travel + Traveler ── (1) TravelerAccountConfig
```

---

## 3. STORE (PINIA)

**Archivo**: `app/stores/use-payment-store.ts`

**Estado**:
```typescript
const payments = ref<Payment[]>([]);
const accountConfigs = ref<TravelerAccountConfig[]>([]);
const loading = shallowRef(false);
const error = shallowRef<string | null>(null);
const filters = ref<PaymentFilters>({});
```

**Getters**:
- `allPayments` — Todos los pagos ordenados por `paymentDate` desc
- `getPaymentById(id)` — Por ID
- `getPaymentsByTravel(travelId)` — Pagos de un viaje
- `getPaymentsByTraveler(travelerId)` — Pagos de un viajero
- `getPaymentsByTravelerAndTravel(travelerId, travelId)` — Pagos cruzados
- `getAccountConfig(travelerId, travelId)` — Config de cuenta por viajero+viaje
- `getTravelerPaymentSummary(travelerId, travelId, travelPrice)` — Resumen completo con descuento, saldo y estado calculados
- `filteredPayments` — Pagos filtrados según `filters` activos
- `getTravelCashSummary(travelId)` — Resumen de caja del viaje

**Actions**:
- `addPayment(data): Payment | { error: string }` — valida que monto ≤ saldo pendiente
- `updatePayment(id, data): Payment | undefined`
- `deletePayment(id): void`
- `setAccountConfig(config): void` — upsert
- `setFilters / clearFilters`

**Persistencia**:
```typescript
persist: {
  key: 'viajeros-ligeros-payments',
  storage: import.meta.client ? localStorage : undefined,
}
```

**Reglas de negocio**:
- `addPayment` rechaza si `amount > balance`
- `status` derivado: `pending` (nada pagado) → `partial` (pago parcial) → `paid` (cubierto)
- Precio para niños configurable por viajero dentro de cada viaje

---

## 4. COMPONENTES

### `payment-form.vue`

**Props**: `payment?`, `travelerId`, `travelId`, `maxAmount`
**Emits**: `submit(data: PaymentFormData)`, `cancel`

| Campo | Componente | Validación |
|-------|-----------|------------|
| Monto | UInput number | > 0, ≤ saldo pendiente |
| Fecha de pago | UInput date | requerido |
| Tipo de pago | USelect | `cash` / `transfer` |
| Notas | UTextarea | opcional |

---

### `payment-account-config-form.vue`

**Props**: `travelerId`, `travelId`, `travelBasePrice`, `config?`
**Emits**: `submit(config: TravelerAccountConfig)`, `cancel`

- Tipo de viajero (radio: adulto / niño)
- Precio para niño (condicional)
- Descuento + tipo (`fixed` / `percentage`)
- Preview del costo final en tiempo real

---

### `payment-summary-card.vue`

**Props**: `summary: TravelerPaymentSummary`, `travelerName`

Muestra breakdown completo: precio base, aplicado, descuento, costo final, abonado, saldo pendiente.
Badge de estado: `pending` → warning · `partial` → info · `paid` → success.

---

## 5. PÁGINAS

### `app/pages/payments/index.vue` — `payments-index`

- 4 stat cards globales: viajes con pagos, total recaudado, saldo pendiente, viajes completados
- Tabla de viajes con resumen de recaudación y % completado

### `app/pages/payments/travel/[id].vue` — `payments-travel`

- 3 stat cards de caja por viaje
- Tabla de viajeros con estado de pago y acciones: registrar abono, ver historial, configurar cuenta
- Filtro por estado (`pending` / `partial` / `paid`)

### `app/pages/payments/traveler/[id].vue` — `payments-traveler`

- Secciones por viaje: `PaymentSummaryCard` + tabla de historial
- Filtros por viaje y rango de fechas
- Edición y eliminación de pagos inline

---

## 6. ARCHIVOS CREADOS / MODIFICADOS

### Creados
1. `app/types/payment.ts`
2. `app/stores/use-payment-store.ts`
3. `app/components/payment-form.vue`
4. `app/components/payment-account-config-form.vue`
5. `app/components/payment-summary-card.vue`
6. `app/pages/payments/index.vue`
7. `app/pages/payments/travel/[id].vue`
8. `app/pages/payments/traveler/[id].vue`

### Modificados
1. `app/components/the-sidebar.vue` — ítem "Pagos" con `i-lucide-credit-card`
2. `app/pages/travels/[id]/index.vue` — botón "Ver Pagos" en header
3. `app/pages/travelers/index.vue` — acción "Ver Pagos" en dropdown de fila

---

## 7. VALIDACIONES Y REGLAS DE NEGOCIO

1. **Saldo pendiente**: Un abono no puede superar el saldo pendiente (`finalCost - totalPaid`).
2. **Config requerida**: No se puede registrar un pago sin `TravelerAccountConfig` configurada para ese viajero+viaje.
3. **Precio por tipo**: Precio adulto = `travel.precio`; precio niño = `childPrice` de la config.
4. **Descuento**: Por viajero dentro de un viaje específico (no global). Monto fijo o porcentaje.
5. **Estado derivado**: Calculado en el getter, no almacenado en BD.
6. **Eliminación con confirmación**: `confirm()` explícito antes de borrar.

---

## 8. RESUMEN DE IMPLEMENTACIÓN

- ✅ Dashboard con estadísticas globales de recaudación
- ✅ Vista de pagos por viaje con caja y tabla de viajeros
- ✅ Historial de pagos por viajero con filtros
- ✅ CRUD completo de pagos
- ✅ Configuración de cuenta: tipo adulto/niño, precio diferenciado, descuento fijo/porcentaje
- ✅ Cálculo automático de saldo pendiente y estado
- ✅ Integración en navegación (sidebar, detalle de viaje, lista de viajeros)
- ✅ Persistencia en localStorage
- ✅ Datos mock para desarrollo

**Última actualización**: 2026-03-24
