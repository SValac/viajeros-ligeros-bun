# 3. Componentes

54 componentes en `app/components/`, agrupados por dominio. Todos usan `<script setup lang="ts">` con Composition API.

---

## 3.1 Layout y Navegación

| Archivo | Propósito |
|---------|-----------|
| `the-sidebar.vue` | Navegación principal lateral |
| `user-menu.vue` | Menú de cuenta de usuario (avatar, cerrar sesión) |
| `logo.vue` | Logo de la marca |
| `the-separator.vue` | Divisor UI reutilizable |

---

## 3.2 Viajes

| Archivo | Propósito |
|---------|-----------|
| `travel-form.vue` | Formulario completo crear/editar viaje (multi-sección) |
| `travel-activity-form.vue` | Agregar/editar actividad del itinerario |
| `travel-activity-list.vue` | Lista de actividades del itinerario |
| `travel-activity-card.vue` | Card individual de actividad |
| `travel-servicios-section.vue` | Sección de servicios incluidos |
| `travel-service-form.vue` | Formulario de servicio |
| `travel-service-list.vue` | Lista de servicios |
| `travel-buses-section.vue` | Sección de buses asignados al viaje |
| `travel-bus-form.vue` | Formulario de bus para el viaje |
| `travel-bus-list.vue` | Lista de buses del viaje |

---

## 3.3 Proveedores

| Archivo | Propósito |
|---------|-----------|
| `provider-form.vue` | Crear/editar proveedor |
| `provider-selector.vue` | Dropdown selector de proveedor |
| `provider-filter-bar.vue` | Barra de filtros (categoría, ciudad, estado, búsqueda) |
| `provider-active-filters.vue` | Chips de filtros activos con botón de limpiar |

---

## 3.4 Buses

| Archivo | Propósito |
|---------|-----------|
| `bus-form.vue` | Crear/editar bus en inventario |
| `bus-list.vue` | Lista de buses de un proveedor |

---

## 3.5 Hoteles y Habitaciones

| Archivo | Propósito |
|---------|-----------|
| `hotel/hotel-rooms-manager.vue` | Gestor completo de habitaciones de hotel |
| `hotel/hotel-rooms-summary.vue` | Resumen de habitaciones disponibles/usadas |
| `hotel/hotel-room-type-card.vue` | Card de tipo de habitación |
| `hotel/hotel-room-type-form.vue` | Formulario de tipo de habitación |
| `hotel/bed-configuration-input.vue` | UI para configurar camas (tamaño + cantidad) |

---

## 3.6 Cotización — Proveedores

| Archivo | Propósito |
|---------|-----------|
| `cotizacion-proveedor-form.vue` | Agregar proveedor a cotización |
| `cotizacion-proveedor-tabla.vue` | Tabla de proveedores cotizados |
| `cotizacion-proveedores-section.vue` | Sección completa de proveedores |

---

## 3.7 Cotización — Hospedaje

| Archivo | Propósito |
|---------|-----------|
| `cotizacion-hospedaje-form.vue` | Agregar hospedaje a cotización |
| `cotizacion-hospedaje-tabla.vue` | Tabla de hospedajes cotizados |
| `cotizacion-hospedaje-resumen.vue` | Resumen de costos de hospedaje |
| `cotizacion-hospedaje-section.vue` | Sección completa de hospedaje |

---

## 3.8 Cotización — Buses

| Archivo | Propósito |
|---------|-----------|
| `cotizacion-bus-form.vue` | Agregar bus a cotización |
| `cotizacion-buses-section.vue` | Sección completa de buses cotizados |
| `cotizacion-bus-cotizacion-form.vue` | Detalle de cotización de bus |

---

## 3.9 Cotización — General

| Archivo | Propósito |
|---------|-----------|
| `cotizacion-header-actions.vue` | Toolbar de la cotización (confirmar, etc.) |
| `cotizacion-precio-publico-section.vue` | Gestión de precios públicos |
| `cotizacion-resumen-financiero.vue` | Resumen financiero total de la cotización |

---

## 3.10 Pagos a Proveedores / Hospedajes / Buses

| Archivo | Propósito |
|---------|-----------|
| `pago-proveedor-form.vue` | Registrar pago a proveedor |
| `pago-proveedor-historial.vue` | Historial de pagos a proveedor |
| `pago-hospedaje-form.vue` | Registrar pago de hospedaje |
| `pago-hospedaje-historial.vue` | Historial de pagos de hospedaje |
| `pago-bus-form.vue` | Registrar pago de bus |
| `pago-bus-historial.vue` | Historial de pagos de bus |

---

## 3.11 Pagos de Viajeros

| Archivo | Propósito |
|---------|-----------|
| `payment-form.vue` | Registrar pago de viajero |
| `payment-summary-card.vue` | Card de resumen de cuenta del viajero |
| `payment-account-config-form.vue` | Configurar precios, descuentos y recargos del viajero |

---

## 3.12 Viajeros y Coordinadores

| Archivo | Propósito |
|---------|-----------|
| `traveler-form.vue` | Agregar/editar viajero |
| `traveler-filter-bar.vue` | Filtros de lista de viajeros |
| `coordinator-form.vue` | Crear/editar coordinador |

---

## 3.13 Mapas y Utilitarios

| Archivo | Propósito |
|---------|-----------|
| `map-location-picker.vue` | Selector de ubicación con Google Maps (autocomplete + pin) |
| `map-location-display.vue` | Mapa estático de solo lectura para mostrar ubicación |
| `rich-text-editor.client.vue` | Editor rich text (Tiptap) — solo cliente |
| `rich-content.vue` | Render de contenido rich text con sanitización DOMPurify |

---

[← Pinia Stores](./02-store.md) | [Volver al índice](./README.md) | [Siguiente: Flujo de Datos →](./04-data-flow.md)
