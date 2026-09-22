# 🧾 Feature Request — Cotización de Viaje

## 🎯 Contexto

El sistema cuenta con módulos de Viajes, Viajeros, Pagos y Proveedores. Actualmente los servicios de un viaje se agregan directamente al crearlo o editarlo, sin ningún mecanismo para estimar costos operativos, calcular el punto de equilibrio por número de asientos, ni llevar el seguimiento de pagos realizados a los proveedores involucrados.

La agencia necesita un módulo de cotización que permita planificar financieramente cada viaje antes de confirmarlo: saber cuánto cuesta operarlo, cuál es el precio mínimo viable por asiento, cuánto se ha pagado a cada proveedor y cuánto falta por liquidar.

---

## 🚀 Objetivo

Implementar un módulo de **Cotización de Viaje** que permita:

- Asociar proveedores a un viaje con sus costos individuales y observaciones
- Calcular automáticamente el costo total del viaje (suma de proveedores)
- Determinar el asiento mínimo para cubrir costos y el punto de ganancia neta
- Derivar el precio por asiento del viaje a partir de la cotización
- Registrar y hacer seguimiento de anticipos y pagos a proveedores
- Confirmar los proveedores de la cotización para que sean los que conformen los servicios del viaje

---

## 📌 Requerimientos Funcionales

### 1. Módulo / Navegación

- Sección **Cotización** accesible desde el detalle de cada viaje (tab o botón "Ver Cotización")
- Acceso desde el listado de viajes (icono de cotización en la fila)
- Indicador visual en el viaje si ya tiene cotización activa

---

### 2. Gestión Principal — Cotización

Cada viaje puede tener **una cotización activa**. La cotización debe permitir:

- Crear la cotización de un viaje
- Editar los parámetros generales (capacidad del autobús, asiento mínimo objetivo)
- Agregar / editar / eliminar proveedores con sus costos dentro de la cotización
- Confirmar la cotización (bloquea cambios y transfiere proveedores al viaje como servicios)
- Ver resumen financiero en tiempo real

---

### 3. Datos de la Entidad

#### `Cotizacion`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `string` | UUID |
| `travelId` | `string` | Viaje al que pertenece |
| `capacidadAutobus` | `number` | Total de asientos disponibles |
| `asientoMinimoObjetivo` | `number` | Asientos mínimos para cubrir costos (calculable o editable manualmente) |
| `precioAsiento` | `number` | Precio por asiento = `travel.precio` (sincronizado) |
| `estado` | `CotizacionStatus` | `borrador` \| `confirmada` |
| `notas` | `string?` | Notas generales de la cotización |
| `createdAt` | `string` | ISO date |
| `updatedAt` | `string` | ISO date |

#### `CotizacionProveedor`

Cada proveedor incluido en la cotización:

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `string` | UUID |
| `cotizacionId` | `string` | Cotización a la que pertenece |
| `providerId` | `string` | Referencia al catálogo de Proveedores |
| `descripcionServicio` | `string` | Descripción del servicio pactado |
| `observaciones` | `string?` | Notas / condiciones del proveedor |
| `costoTotal` | `number` | Costo total pactado con el proveedor |
| `metodoPago` | `PaymentType` | `efectivo` \| `transferencia` |
| `confirmado` | `boolean` | Si el servicio está confirmado por el proveedor |

#### `PagoProveedor`

Historial de pagos realizados a cada proveedor de la cotización:

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `string` | UUID |
| `cotizacionProveedorId` | `string` | Referencia al proveedor en la cotización |
| `monto` | `number` | Monto del pago |
| `fechaPago` | `string` | Fecha del pago |
| `tipoPago` | `PaymentType` | `efectivo` \| `transferencia` |
| `concepto` | `string?` | Concepto del pago (anticipo, liquidación, etc.) |
| `notas` | `string?` | Observaciones del pago |
| `createdAt` | `string` | ISO date |

#### Propiedades nuevas en `Travel`

Agregar a la entidad existente:

| Campo | Tipo | Descripción |
|---|---|---|
| `costoTotalOperacion` | `number?` | Suma total de costos de proveedores (calculado desde cotización) |
| `asientoMinimo` | `number?` | Asientos mínimos para punto de equilibrio |
| `gananciaProyectada` | `number?` | Ganancia estimada al llenar el autobús completo |
| `acumuladoViajeros` | `number?` | Total recaudado de viajeros (sincronizado desde Pagos) |

#### Reglas especiales

- El `costoTotalOperacion` es la suma de todos los `costoTotal` de los `CotizacionProveedor` activos.
- El `asientoMinimoObjetivo` puede calcularse automáticamente: `ceil(costoTotalOperacion / precioAsiento)` o definirse manualmente.
- La **ganancia neta proyectada** = `(capacidadAutobus - asientoMinimoObjetivo) * precioAsiento`.
- El **anticipo pagado** a un proveedor = suma de sus `PagoProveedor`.
- El **saldo pendiente** con el proveedor = `costoTotal - sumaPagos`.
- Una cotización solo puede **confirmarse** si todos los `CotizacionProveedor` tienen `confirmado: true`.
- Al confirmar la cotización, los proveedores confirmados se agregan como `TravelService` al viaje.
- Una cotización `confirmada` no puede editarse (solo consultar).

---

### 4. Visualización

#### Vista principal de la Cotización (tab en detalle del viaje)

**Resumen financiero (cards en la parte superior):**
- Costo total de operación (suma de proveedores)
- Precio por asiento actual
- Asiento mínimo para equilibrio / asiento de ganancia
- Ganancia proyectada (asientos libres × precio)
- Acumulado de viajeros (total abonado)
- Saldo pendiente con proveedores (total sin liquidar)

**Tabla de proveedores de la cotización:**

| Proveedor | Servicio | Costo Total | Pagado | Pendiente | Método | Estado | Acciones |
|---|---|---|---|---|---|---|---|
| Hotel XYZ | Hospedaje 2 noches | $5,000 | $2,000 | $3,000 | Transferencia | Confirmado | Ver pagos / Pagar / Editar / Eliminar |

**Indicadores visuales:**
- Badge de estado del proveedor: `pendiente` (warning), `anticipo pagado` (info), `liquidado` (success)
- Badge de confirmación del servicio: `por confirmar` (gray) / `confirmado` (green)

---

### 5. Filtros / Búsqueda

En la tabla de proveedores de la cotización, filtrar por:
- Estado de pago: `todos` / `pendiente` / `anticipo pagado` / `liquidado`
- Confirmación del servicio: `todos` / `confirmado` / `por confirmar`
- Método de pago: `todos` / `efectivo` / `transferencia`

---

### 6. Acciones adicionales

#### Gestión de pagos a proveedores
- Desde cada proveedor en la cotización, abrir un **historial de pagos** (modal lateral o drawer)
- Registrar un nuevo pago al proveedor desde el historial
- Editar o eliminar un pago existente (con confirmación)

#### Cálculo automático del asiento mínimo
- Botón "Calcular automáticamente" que rellena `asientoMinimoObjetivo` = `ceil(costoTotalOperacion / precioAsiento)`
- El campo sigue siendo editable manualmente para ajustes

#### Sincronización de precio
- Si se edita `travel.precio`, el `precioAsiento` de la cotización se actualiza automáticamente y recalcula los indicadores

#### Confirmación de cotización
- Botón "Confirmar cotización" (solo habilitado si todos los proveedores están confirmados)
- Al confirmar: crea los `TravelService` correspondientes en el viaje y bloquea la cotización

---

## 🧠 Consideraciones de Negocio

- Un viaje tiene **una sola cotización activa** a la vez. Si ya existe, se edita la misma.
- Los servicios del viaje ya no se agregan directamente desde el formulario de viaje; la fuente de verdad son los proveedores confirmados en la cotización.
- El campo `travel.precio` representa el precio del asiento — la cotización lo usa como base de cálculo, no lo reemplaza.
- El acumulado de viajeros viene del módulo de Pagos (suma de `TravelerPaymentSummary.totalPaid` por viaje) y es de solo lectura en la cotización.
- Un proveedor puede recibir múltiples pagos parciales (anticipos) antes de la liquidación final.
- El estado de pago al proveedor es **calculado**: `pendiente` (sin pagos) → `anticipo` (pagos < costoTotal) → `liquidado` (pagos ≥ costoTotal).
- Los proveedores que no estén en el catálogo activo deben mostrarse con advertencia ("proveedor inactivo").

---

## ⚠️ Restricciones

- La cotización `confirmada` es de solo lectura. Para modificarla se requeriría "desconfirmar" (acción con advertencia).
- No se puede registrar un pago al proveedor que exceda el `costoTotal` acordado.
- El `asientoMinimoObjetivo` no puede ser mayor que `capacidadAutobus`.
- Solo los proveedores marcados como `confirmado: true` se transfieren como servicios del viaje.
- La eliminación de un `PagoProveedor` no es posible si la cotización está `confirmada`.

---

## ✅ Resultado Esperado

El coordinador de la agencia puede abrir el detalle de cualquier viaje y acceder a su cotización, donde ve de un vistazo cuánto cuesta operarlo, cuántos asientos necesita vender para no perder, cuánto lleva recaudado de los viajeros y cuánto le falta pagar a cada proveedor. Una vez que todos los proveedores confirman su servicio y se liquidan (o abonan), el coordinador confirma la cotización y el viaje queda con sus servicios formalmente definidos, listo para operar.
