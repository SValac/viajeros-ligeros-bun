# 4. Flujo de Datos

## Arquitectura general

```
┌─────────────────────────────────────────────────────────────┐
│  COMPONENTE: travels/dashboard.vue                          │
│  - Muestra tabla de viajes                                  │
│  - Gestiona modales (crear/editar)                          │
│  - Lee datos del store                                      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ usa travelsStore
                 │ llama actions
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  STORE: stores/travels.ts (Pinia)                           │
│  - Estado centralizado (travels[])                          │
│  - Getters (filtros, estadísticas)                          │
│  - Actions (CRUD operations)                                │
│  - Persistencia automática en localStorage                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ persiste/recupera
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  LOCALSTORAGE: "viajeros-ligeros-travels"                   │
│  - Almacenamiento persistente del estado                    │
│  - Se sincroniza automáticamente con el store               │
└─────────────────────────────────────────────────────────────┘
```

---

## Operaciones CRUD

### CREAR

1. Usuario hace clic en "Nuevo Viaje"
2. Se abre modal con `TravelForm` (`props.travel = null`)
3. Usuario completa formulario y submit
4. `TravelForm` emite evento `@submit` con datos
5. Dashboard llama `travelsStore.addTravel(data)`
6. Store genera ID, timestamps y agrega al array
7. Pinia persiste automáticamente en localStorage
8. Vista se actualiza reactivamente

### EDITAR

1. Usuario hace clic en "Editar" en dropdown de fila
2. Se abre modal con `TravelForm` (`props.travel = travelObject`)
3. Formulario se pre-rellena con datos existentes
4. Usuario modifica y submit
5. Dashboard llama `travelsStore.updateTravel(id, data)`
6. Store actualiza objeto y timestamp
7. Pinia persiste cambios
8. Vista se actualiza

### ELIMINAR

1. Usuario hace clic en "Eliminar"
2. Confirmación con dialog
3. Dashboard llama `travelsStore.deleteTravel(id)`
4. Store elimina del array
5. Pinia persiste
6. Vista se actualiza

### LEER

1. Dashboard accede a `travelsStore.allTravels` (getter)
2. Getter devuelve array ordenado reactivamente
3. UTable recibe `:data="travelsStore.allTravels"`
4. Tabla se actualiza automáticamente en cambios

---

[← Componentes](./03-components.md) | [Volver al índice](./README.md) | [Siguiente: Validaciones →](./05-validations.md)
