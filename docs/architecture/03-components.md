# 3. Componentes

~100 componentes en `app/components/`, agrupados en carpetas por dominio. Todos usan `<script setup lang="ts">` con Composition API.

---

## 3.0 Convención de nombres (Nuxt)

Nuxt arma el nombre del componente con la ruta de carpetas + el nombre del archivo, **quitando los segmentos duplicados**: `travel/calendar/travel-calendar-filters.vue` → `<TravelCalendarFilters>`.

- **El nombre del archivo es el nombre completo del componente**, con el prefijo de su carpeta: `quotation/bus/quotation-bus-form.vue`, no `quotation/bus/form.vue`. Así se encuentra por nombre de archivo y no cambia si se mueve.
- **La subcarpeta debe repetir el prefijo del archivo.** Nuxt solo quita el segmento si el final de la ruta coincide con el inicio del archivo: `travel/itinerary/travel-activity-card.vue` daría `TravelItineraryTravelActivityCard`.
- **Carpeta por dominio; subcarpeta solo si agrupa 3 o más archivos** con el mismo prefijo.
- **En la raíz solo van componentes globales** que se usan en toda la app (estados de carga, inputs, layout).
- **Nombres en inglés**, también la API pública (props, emits, tipos exportados).
- Tras mover o renombrar, revisar `.nuxt/components.d.ts`: un nombre con un segmento repetido indica que la carpeta y el archivo no coinciden.

---

## 3.1 Globales (raíz)

| Archivo | Propósito |
|---------|-----------|
| `load-state.vue` | Carga, error con reintento y contenido de una query |
| `empty-state.vue` | Estado vacío con textos de `utils/empty-states.ts` y acciones |
| `money-input.vue` | Input de moneda (o porcentaje) |
| `phone-input.vue` | Input de teléfono con lada |
| `char-counter.vue` | Contador de caracteres para textareas |
| `rich-text-editor.client.vue` | Editor rich text (Tiptap) — solo cliente |
| `rich-content.vue` | Render de contenido rich text con sanitización DOMPurify |
| `unsaved-changes-modal.vue` | Confirmación al salir con cambios sin guardar |
| `confirm-delete-modal.vue` | Confirmación de borrado (se abre con `useConfirmDelete`) |
| `stat-card.vue` | Tarjeta de cifra: etiqueta, ícono, valor y slot de detalle |
| `page-header.vue` | Título de la pantalla: descripción, volver, ícono, badge y acciones |
| `password-input.vue` | Input de contraseña con mostrar/ocultar |
| `form-actions.vue` | Botones Cancelar + enviar al pie de un formulario |
| `image-upload.vue` | Elegir imagen con vista previa (el padre la sube) |
| `the-sidebar.vue` | Navegación principal lateral |
| `user-menu.vue` | Menú de cuenta de usuario |
| `logo.vue` | Logo de la marca |
| `the-separator.vue` | Divisor con texto o icono |

---

## 3.2 `travel/` — Viajes

| Archivo | Propósito |
|---------|-----------|
| `travel-form.vue` | Crear/editar viaje |
| `travel-access-code-card.vue` | Código de acceso del viaje |
| `travel-accommodation-card.vue` / `-form.vue` | Hospedaje y habitaciones del viaje |
| `travel-room-type-group.vue` | Habitaciones de un tipo |
| `travel-buses-section.vue` | Buses asignados al viaje |
| `travel-coordinators-card.vue` | Coordinadores y sus asientos |
| `travel-optional-service-card.vue` / `-list.vue` | Servicios cobrados por persona |
| `travel-payments-panel.vue` | Pagos de los viajeros de un viaje |
| `travel-service-form.vue` / `-list.vue` | Servicios incluidos (la lista guarda cada cambio con `useEditableList`) |
| `activity/travel-activity-*.vue` | Itinerario: lista, card y formulario de actividad |
| `calendar/travel-calendar*.vue` | Calendario de viajes: calendario, filtros, lista y resumen |
| `gallery/travel-gallery-*.vue` | Galería: sección, subida y visor |

---

## 3.3 `quotation/` — Cotización

| Archivo | Propósito |
|---------|-----------|
| `quotation-header-actions.vue` | Estado y confirmación de la cotización |
| `quotation-parameters-card.vue` | Parámetros (asientos, meta mínima) |
| `quotation-financial-summary.vue` | Resumen financiero |
| `quotation-summary-section.vue` | Sección del resumen |
| `quotation-expense-form.vue` / `-section.vue` | Gastos extra |
| `quotation-payment-form.vue` / `quotation-payment-history.vue` | Pagos a proveedores, hospedajes y buses (prop `kind`); datos y acciones vía `useSupplierPayments` |
| `accommodation/quotation-accommodation-*.vue` | Hospedaje: sección, tabla, formulario, tipos de habitación y resumen |
| `bus/quotation-bus-*.vue` | Buses: sección y formulario |
| `provider/quotation-provider-*.vue` | Proveedores de servicios: sección, tabla, formulario, ajustes de precio y cortesía |
| `public-price/quotation-public-price-*.vue` | Precios al público: sección, formulario y aviso al editar/eliminar un precio en uso |

---

## 3.4 `provider/` — Proveedores

| Archivo | Propósito |
|---------|-----------|
| `provider-category-list.vue` | Lista de proveedores de una categoría |
| `provider-detail-card.vue` | Detalle de un proveedor |
| `provider-form.vue` | Crear/editar proveedor |
| `provider-selector.vue` | Selector de proveedor |
| `provider-filter-bar.vue` / `provider-active-filters.vue` | Filtros y chips de filtros activos |

---

## 3.5 `hotel/` — Habitaciones de hotel

| Archivo | Propósito |
|---------|-----------|
| `hotel-rooms-manager.vue` | Gestor de tipos de habitación de un hotel |
| `hotel-rooms-summary.vue` | Resumen de habitaciones |
| `hotel-room-type-card.vue` / `-form.vue` | Tipo de habitación |
| `hotel-bed-configuration-input.vue` | Configuración de camas (tamaño + cantidad) |

---

## 3.6 `bus/`, `coordinator/`, `traveler/`, `payment/`, `map/`

| Archivo | Propósito |
|---------|-----------|
| `bus/bus-form.vue` / `bus-list.vue` | Inventario de buses de una agencia |
| `bus/bus-seat-map.vue` / `bus-seat-card.vue` | Mapa de asientos |
| `coordinator/coordinator-form.vue` | Crear/editar coordinador |
| `coordinator/coordinator-invite-button.vue` | Invitar coordinador a la app |
| `coordinator/coordinator-seat-form.vue` | Asiento del coordinador en el viaje |
| `traveler/traveler-form.vue` / `traveler-filter-bar.vue` | Viajeros: formulario y filtros |
| `payment/payment-form.vue` | Registrar pago de viajero |
| `payment/payment-summary-card.vue` | Resumen de cuenta del viajero |
| `payment/payment-account-config-form.vue` | Precio, descuentos y recargos del viajero |
| `map/map-location-picker.vue` | Selector de ubicación con Google Maps |

---

## 3.7 `agency/` — Perfil de la agencia

| Archivo | Propósito |
|---------|-----------|
| `agency-profile-form.vue` / `agency-brand-preview.vue` / `agency-color-input.vue` | Datos y marca |
| `agency-seo-form.vue` / `agency-seo-preview.vue` | SEO |
| `agency-about-page-editor.vue` | Editor de la página "Nosotros" |
| `agency-icon-picker.vue` | Icono |
| `home/agency-home-*.vue` | Página de inicio: editor y campos de bloque |
| `page/agency-page-*.vue` | Páginas del sitio: formulario (`AgencyPageForm`, recibe el editor en su slot), secciones editables, card, items y modal de confirmación |

---

[← Pinia Stores](./02-store.md) | [Volver al índice](./README.md) | [Siguiente: Flujo de Datos →](./04-data-flow.md)
