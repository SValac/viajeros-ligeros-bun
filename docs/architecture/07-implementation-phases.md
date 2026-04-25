# 7. Estado del Proyecto

## Funcionalidades implementadas

### ✅ Autenticación
- Login y registro con Supabase Auth
- Middleware global que protege todas las rutas
- Store de auth con getters de usuario y acciones localizadas

### ✅ Gestión de Viajes
- CRUD completo de viajes con relaciones anidadas
- Itinerario por días con ubicaciones en Google Maps
- Asignación de buses con datos de operadores
- Asignación de coordinadores
- Servicios incluidos por viaje
- Dashboard con estadísticas y tabla

### ✅ Gestión de Proveedores
- CRUD de proveedores por categoría: guías, transporte, hospedaje, agencias de buses, alimentos, otros
- Filtros avanzados por categoría, ciudad, estado y búsqueda
- Gestión de habitaciones de hotel con tipos y configuración de camas
- Gestión de flota de buses por agencia

### ✅ Cotizaciones
- Cotización completa por viaje
- Servicios de proveedores con tipo de split de costo (mínimo / total)
- Cotización de hospedaje con desglose por tipo de habitación
- Cotización de buses reservados con coordinadores asignados
- Precios públicos configurables (adulto, niño, por tipo de habitación)
- Matriz de precios de referencia
- Registro de pagos a proveedores, hospedajes y buses
- Confirmación de cotización

### ✅ Viajeros
- CRUD de viajeros por viaje
- Agrupación representante → acompañantes
- Asignación de bus y número de asiento
- Punto de abordaje

### ✅ Pagos de Viajeros
- Configuración de cuenta por viajero (tipo adulto/niño, precio público)
- Descuentos y recargos (fijos o porcentaje)
- Registro de pagos (efectivo / transferencia)
- Cálculo automático de balance y status
- Dashboard de pagos por viaje y por viajero

### ✅ Coordinadores
- CRUD de coordinadores
- Asignación a viajes y a buses de cotización

---

## Áreas pendientes / por explorar

- Exportación de datos (PDF, CSV de viajeros o cotización)
- Notificaciones / recordatorios de pagos
- Paginación en tablas con muchos registros
- Realtime de Supabase para multi-usuario simultáneo

---

[← UX/UI](./06-ux-ui.md) | [Volver al índice](./README.md) | [Siguiente: Estructura de Archivos →](./08-file-structure.md)
