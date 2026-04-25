# 6. UX/UI

## Layout principal (`app/layouts/default.vue`)

```vue
<UDashboardGroup>
  <TheSidebar />
  <UDashboardPanel>
    <!-- UDashboardNavbar + slot -->
  </UDashboardPanel>
</UDashboardGroup>
```

El layout es CSR-only (`ssr: false` en `nuxt.config.ts`). Las páginas de auth (`/login`, `/register`) no usan este layout.

---

## Páginas (22 páginas)

### Autenticación
| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/login` | `pages/login.vue` | Email + contraseña |
| `/register` | `pages/register.vue` | Registro de usuario |

### Dashboard
| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/` | `pages/index.vue` | Página de bienvenida |
| `/travels/dashboard` | `pages/travels/dashboard.vue` | Stats y tabla de viajes |

### Viajes
| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/travels/new` | `pages/travels/new.vue` | Crear viaje |
| `/travels/[id]` | `pages/travels/[id]/index.vue` | Detalle del viaje |
| `/travels/[id]/edit` | `pages/travels/[id]/edit.vue` | Editar viaje |
| `/travels/[id]/cotizacion` | `pages/travels/[id]/cotizacion.vue` | Cotización del viaje |
| `/travels/[id]/travelers` | `pages/travels/[id]/travelers/index.vue` | Viajeros del viaje |

### Proveedores
| Ruta | Descripción |
|------|-------------|
| `/providers` | Lista de todos los proveedores |
| `/providers/[category]` | Filtro por categoría |
| `/providers/accommodation/[id]` | Detalle + gestión de habitaciones |
| `/providers/bus-agencies/[id]` | Detalle + flota de buses |

### Pagos
| Ruta | Descripción |
|------|-------------|
| `/payments` | Dashboard de pagos |
| `/payments/travel/[id]` | Pagos de un viaje específico |
| `/payments/traveler/[id]` | Historial de pagos de un viajero |

### Coordinadores
| Ruta | Descripción |
|------|-------------|
| `/coordinators` | Gestión de coordinadores |

---

## Componentes Nuxt UI utilizados

| Componente | Uso principal |
|------------|---------------|
| `UDashboardGroup`, `UDashboardPanel` | Layout base |
| `UTable` | Tablas de datos (viajes, proveedores, viajeros, pagos) |
| `UModal` | Formularios en overlay |
| `UForm` | Formularios con validación Zod integrada |
| `UFormField` | Campos con label y mensajes de error |
| `UInput`, `UTextarea`, `USelect` | Inputs básicos |
| `UButton` | Acciones (con `:loading` para estados async) |
| `UBadge` | Estado del viaje con colores semánticos |
| `UDropdownMenu` | Menú de acciones por fila |
| `UToast` / `useToast()` | Notificaciones |
| `UTabs` | Navegación en páginas de detalle |
| `UCard` | Contenedores de sección |
| `UAlert` | Mensajes de error/advertencia |
| `USeparator` | Separadores visuales |

---

## Colores de estado de viaje

| Status | Color |
|--------|-------|
| `pending` | `warning` (amarillo) |
| `confirmed` | `info` (azul) |
| `in_progress` | `primary` |
| `completed` | `success` (verde) |
| `cancelled` | `error` (rojo) |

---

## Feedback visual

### Toasts
```typescript
const toast = useToast();
toast.add({ title: 'Viaje creado', color: 'success', icon: 'i-lucide-check-circle' });
toast.add({ title: 'Error', description: error.message, color: 'error' });
```

### Estado de carga en botones
```vue
<UButton :loading="isSubmitting" :disabled="isSubmitting" type="submit" label="Guardar" />
```

### Errores de auth localizados
El `use-auth-store` mapea errores de Supabase a mensajes en español antes de propagarlos.

---

## Google Maps

Dos componentes para ubicaciones en actividades del itinerario:

- **`map-location-picker.vue`**: selector con autocomplete de Places API y pin arrastrable. Emite `{ lat, lng, placeId, address }`.
- **`map-location-display.vue`**: mapa de solo lectura centrado en coordenadas dadas.

La inicialización del SDK de Maps es lazy (se carga el script solo cuando se necesita) mediante `app/composables/use-google-maps.ts`.

---

[← Validaciones](./05-validations.md) | [Volver al índice](./README.md) | [Siguiente: Estado del Proyecto →](./07-implementation-phases.md)
