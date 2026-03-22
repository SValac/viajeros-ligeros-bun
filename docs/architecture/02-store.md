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
    loadMockData() {
      // Solo cargar si no hay datos
      if (this.travels.length === 0) {
        const mockTravels: Travel[] = [
          {
            id: crypto.randomUUID(),
            destino: 'París, Francia',
            fechaInicio: '2025-04-15',
            fechaFin: '2025-04-22',
            precio: 1500,
            descripcion: 'Tour completo por París incluyendo Torre Eiffel, Louvre y Versalles',
            imagenUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34',
            estado: 'confirmado',
            cliente: 'María García',
            itinerario: [
              { id: '1', dia: 1, titulo: 'Llegada', descripcion: 'Check-in hotel', hora: '14:00' },
              { id: '2', dia: 2, titulo: 'Torre Eiffel', descripcion: 'Visita guiada', hora: '10:00' },
            ],
            servicios: [
              { id: '1', nombre: 'Vuelos ida y vuelta', incluido: true },
              { id: '2', nombre: 'Hotel 4 estrellas', incluido: true },
              { id: '3', nombre: 'Guía turístico', incluido: true },
            ],
            notasInternas: 'Cliente VIP, requiere habitación con vista',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: crypto.randomUUID(),
            destino: 'Barcelona, España',
            fechaInicio: '2025-05-10',
            fechaFin: '2025-05-17',
            precio: 1200,
            descripcion: 'Experiencia gastronómica y cultural en Barcelona',
            imagenUrl: 'https://images.unsplash.com/photo-1583422409516-2895a77efded',
            estado: 'pendiente',
            cliente: 'Juan Pérez',
            itinerario: [],
            servicios: [
              { id: '1', nombre: 'Vuelos', incluido: true },
              { id: '2', nombre: 'Hotel boutique', incluido: true },
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
        this.travels = mockTravels;
      }
    },
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
