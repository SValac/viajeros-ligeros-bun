# 2. Pinia Store

**Archivo**: `app/stores/travels.ts`

**Razón**: Store central para gestión de estado de viajes con persistencia en localStorage.

```typescript
import { defineStore } from 'pinia';

import type { Travel, TravelFormData, TravelStatus } from '~/types/travel';

export const useTravelsStore = defineStore('travels', {
  state: () => ({
    travels: [] as Travel[],
    loading: false,
    error: null as string | null,
  }),

  getters: {
    // Obtener todos los viajes ordenados por fecha de creación (más recientes primero)
    allTravels: (state) => {
      return [...state.travels].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },

    // Obtener viaje por ID
    getTravelById: (state) => {
      return (id: string) => state.travels.find(t => t.id === id);
    },

    // Filtrar por estado
    getTravelsByStatus: (state) => {
      return (status: TravelStatus) => state.travels.filter(t => t.estado === status);
    },

    // Estadísticas básicas
    stats: state => ({
      total: state.travels.length,
      pendientes: state.travels.filter(t => t.estado === 'pendiente').length,
      confirmados: state.travels.filter(t => t.estado === 'confirmado').length,
      enCurso: state.travels.filter(t => t.estado === 'en-curso').length,
      completados: state.travels.filter(t => t.estado === 'completado').length,
      cancelados: state.travels.filter(t => t.estado === 'cancelado').length,
    }),

    // Ingresos totales (solo viajes pagados/completados)
    totalRevenue: (state) => {
      return state.travels
        .filter(t => t.estado === 'completado' || t.estado === 'confirmado')
        .reduce((sum, t) => sum + t.precio, 0);
    },
  },

  actions: {
    // Crear nuevo viaje
    addTravel(data: TravelFormData) {
      const now = new Date().toISOString();
      const newTravel: Travel = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      };
      this.travels.push(newTravel);
      return newTravel;
    },

    // Actualizar viaje existente
    updateTravel(id: string, data: Partial<TravelFormData>) {
      const index = this.travels.findIndex(t => t.id === id);
      if (index !== -1) {
        this.travels[index] = {
          ...this.travels[index],
          ...data,
          updatedAt: new Date().toISOString(),
        };
        return this.travels[index];
      }
      return null;
    },

    // Eliminar viaje
    deleteTravel(id: string) {
      const index = this.travels.findIndex(t => t.id === id);
      if (index !== -1) {
        this.travels.splice(index, 1);
        return true;
      }
      return false;
    },

    // Cambiar estado de viaje
    updateTravelStatus(id: string, status: TravelStatus) {
      return this.updateTravel(id, { estado: status });
    },

    // Cargar datos de ejemplo (útil para desarrollo/demo)
  },

  // Persistencia en localStorage
  persist: {
    key: 'viajeros-ligeros-travels',
    storage: typeof window !== 'undefined' ? localStorage : undefined,
  },
});
```

---

[← Tipos TypeScript](./01-types.md) | [Volver al índice](./README.md) | [Siguiente: Componentes →](./03-components.md)
