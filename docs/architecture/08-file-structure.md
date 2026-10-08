# 8. Estructura de Archivos

```
app/
├── types/                          # Tipos TypeScript del dominio
│   ├── bus.ts
│   ├── coordinator.ts
│   ├── database.types.ts           # Auto-generado por Supabase CLI
│   ├── hotel-room.ts
│   ├── payment.ts
│   ├── provider.ts
│   ├── quotation.ts
│   ├── traveler.ts
│   └── travel.ts
│
├── stores/                         # Pinia stores (9 stores)
│   ├── use-auth-store.ts
│   ├── use-bus-store.ts
│   ├── use-coordinator-store.ts
│   ├── use-cotizacion-store.ts     # El más complejo (~1,900 LOC)
│   ├── use-hotel-room-store.ts
│   ├── use-payment-store.ts
│   ├── use-provider-store.ts
│   ├── use-traveler-store.ts
│   └── use-travel-store.ts
│
├── composables/
│   ├── auth/
│   │   ├── use-auth-adapter.ts         # Adaptador Supabase Auth → dominio
│   │   └── use-auth-domain.ts          # Lógica pura de autenticación
│   ├── buses/
│   │   └── use-bus-repository.ts       # Acceso Supabase para buses
│   ├── coordinators/
│   │   └── use-coordinator-repository.ts
│   ├── hotel-rooms/
│   │   ├── use-hotel-room-domain.ts    # Validaciones y cálculos de habitaciones
│   │   └── use-hotel-room-repository.ts
│   ├── payments/
│   │   ├── use-payments-domain.ts
│   │   └── use-payments-repository.ts
│   ├── providers/
│   │   ├── use-provider-domain.ts
│   │   └── use-provider-repository.ts
│   ├── quotation/
│   │   ├── use-quotation-domain.ts     # calcPaymentStatus, calcSeatPrice, countRoomsByType
│   │   └── use-quotation-repository.ts # ~30 funciones, 8 tablas
│   ├── travelers/
│   │   ├── use-traveler-domain.ts
│   │   └── use-traveler-repository.ts
│   ├── travels/
│   │   ├── use-travel-domain.ts
│   │   └── use-travel-repository.ts
│   ├── use-google-maps.ts              # Carga lazy del SDK de Google Maps
│   └── use-supabase.ts                 # Cliente Supabase singleton tipado
│
├── middleware/
│   └── auth.global.ts              # Guard global de autenticación
│
├── plugins/
│   └── init-stores.client.ts       # Carga inicial de todos los stores
│
├── layouts/
│   └── default.vue                 # Dashboard layout (UDashboardGroup)
│
├── pages/
│   ├── index.vue                   # Bienvenida
│   ├── login.vue
│   ├── register.vue
│   ├── coordinators/
│   │   └── index.vue
│   ├── payments/
│   │   ├── index.vue
│   │   ├── travel/[id].vue
│   │   └── traveler/[id].vue
│   ├── providers/
│   │   ├── index.vue
│   │   ├── [category].vue
│   │   ├── accommodation/
│   │   │   ├── index.vue
│   │   │   └── [id].vue
│   │   ├── bus-agencies/
│   │   │   ├── index.vue
│   │   │   └── [id].vue
│   │   ├── food-services/index.vue
│   │   ├── guides/index.vue
│   │   ├── other/index.vue
│   │   └── transportation/index.vue
│   └── travels/
│       ├── dashboard.vue
│       ├── new.vue
│       └── [id]/
│           ├── index.vue
│           ├── edit.vue
│           ├── cotizacion.vue
│           └── travelers/
│               └── index.vue
│
├── components/                     # 54 componentes
│   ├── hotel/
│   │   ├── bed-configuration-input.vue
│   │   ├── hotel-room-type-card.vue
│   │   ├── hotel-room-type-form.vue
│   │   ├── hotel-rooms-manager.vue
│   │   └── hotel-rooms-summary.vue
│   ├── bus-form.vue
│   ├── bus-list.vue
│   ├── coordinator-form.vue
│   ├── cotizacion-*.vue            # ~12 componentes de cotización
│   ├── map-location-display.vue
│   ├── map-location-picker.vue
│   ├── pago-*.vue                  # ~6 componentes de pagos a proveedores/buses/hospedajes
│   ├── payment-*.vue               # ~3 componentes de pagos de viajeros
│   ├── provider-*.vue              # ~4 componentes de proveedores
│   ├── rich-content.vue
│   ├── rich-text-editor.client.vue
│   ├── the-sidebar.vue
│   ├── the-separator.vue
│   ├── travel-*.vue                # ~10 componentes de viajes
│   ├── traveler-*.vue              # ~2 componentes de viajeros
│   ├── logo.vue
│   └── user-menu.vue
│
├── utils/
│   ├── mappers.ts                  # Mapeo snake_case (BD) ↔ camelCase (dominio)
│   └── hotel-room-helpers.ts       # calculateCostPerPerson, formatBedConfiguration
│
├── assets/
│   └── css/
│       └── main.css
│
├── app.vue                         # Root component
├── app.config.ts                   # Config de Nuxt UI (estilos de botones)
└── error.vue                       # Página de error global

supabase/
└── migrations/                     # 9 archivos de migración SQL
    ├── 001_extensions_enums.sql
    ├── 002_providers_coordinators.sql
    ├── 003_buses_hotel_rooms.sql
    ├── 004_travels.sql
    ├── 005_travelers.sql
    ├── 006_payments.sql
    ├── 007_quotations.sql
    ├── 008_accommodation_payments.sql
    └── 009_travel_activity_map_locations.sql
```

---

[← Estado del Proyecto](./07-implementation-phases.md) | [Volver al índice](./README.md) | [Siguiente: Dependencias →](./09-dependencies.md)
