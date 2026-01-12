import { defineStore } from 'pinia';

import type { Provider, ProviderCategory, ProviderFormData, ProviderUpdateData } from '~/types/provider';

export const useProviderStore = defineStore('providers', () => {
  // State
  const providers = ref<Provider[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const allProviders = computed(() => {
    return [...providers.value].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es'),
    );
  });

  const activeProviders = computed(() => {
    return providers.value.filter(p => p.activo);
  });

  const getProviderById = computed(() => {
    return (id: string) => providers.value.find(p => p.id === id);
  });

  const getProvidersByCategory = computed(() => {
    return (categoria: ProviderCategory) =>
      providers.value.filter(p => p.categoria === categoria && p.activo);
  });

  const statsByCategory = computed(() => {
    const stats: Record<ProviderCategory, number> = {
      'guias': 0,
      'transporte': 0,
      'hospedaje': 0,
      'operadores-autobus': 0,
      'comidas': 0,
      'otros': 0,
    };

    providers.value
      .filter(p => p.activo)
      .forEach(p => stats[p.categoria]++);

    return stats;
  });

  const totalProviders = computed(() => {
    return providers.value.filter(p => p.activo).length;
  });

  // Actions
  function addProvider(data: ProviderFormData): Provider {
    const now = new Date().toISOString();
    const newProvider: Provider = {
      ...data,
      id: `provider-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    providers.value.push(newProvider);
    error.value = null;
    return newProvider;
  }

  function updateProvider(id: string, data: Partial<ProviderUpdateData>): boolean {
    const index = providers.value.findIndex(p => p.id === id);
    if (index === -1) {
      error.value = 'Proveedor no encontrado';
      return false;
    }

    const existing = providers.value[index];
    if (!existing) {
      error.value = 'Proveedor no encontrado';
      return false;
    }

    providers.value[index] = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    error.value = null;
    return true;
  }

  function deleteProvider(id: string): boolean {
    const index = providers.value.findIndex(p => p.id === id);
    if (index === -1) {
      error.value = 'Proveedor no encontrado';
      return false;
    }

    providers.value.splice(index, 1);
    error.value = null;
    return true;
  }

  function toggleProviderStatus(id: string): boolean {
    const provider = getProviderById.value(id);
    if (!provider) {
      error.value = 'Proveedor no encontrado';
      return false;
    }

    return updateProvider(id, { activo: !provider.activo });
  }

  function loadMockData(): void {
    if (providers.value.length > 0)
      return;

    const mockProviders: ProviderFormData[] = [
      {
        nombre: 'Guías Expertos México',
        categoria: 'guias',
        descripcion: 'Guías certificados con amplia experiencia en turismo cultural',
        contacto: {
          nombre: 'Juan Pérez',
          telefono: '+52 55 1234 5678',
          email: 'contacto@guiasexpertos.mx',
          notas: 'Disponibilidad: 7 días a la semana',
        },
        activo: true,
      },
      {
        nombre: 'Transportes Turísticos del Norte',
        categoria: 'transporte',
        descripcion: 'Flota de vehículos modernos para grupos de hasta 50 personas',
        contacto: {
          nombre: 'María González',
          telefono: '+52 81 9876 5432',
          email: 'info@transportesnorte.com',
        },
        activo: true,
      },
      {
        nombre: 'Hotel Paradise Beach',
        categoria: 'hospedaje',
        descripcion: 'Hotel 5 estrellas frente al mar con spa y restaurante gourmet',
        contacto: {
          nombre: 'Carlos Ramírez',
          telefono: '+52 998 123 4567',
          email: 'reservas@paradisebeach.com',
          notas: 'Descuento especial para grupos',
        },
        activo: true,
      },
      {
        nombre: 'Autobuses Primera Clase',
        categoria: 'operadores-autobus',
        descripcion: 'Servicio de autobuses de lujo con WiFi y entretenimiento a bordo',
        contacto: {
          nombre: 'Roberto Silva',
          telefono: '+52 33 8765 4321',
          email: 'ventas@primeraclase.mx',
        },
        activo: true,
      },
      {
        nombre: 'Restaurante La Tradición',
        categoria: 'comidas',
        descripcion: 'Cocina mexicana tradicional con menús personalizados para grupos',
        contacto: {
          nombre: 'Ana Martínez',
          telefono: '+52 55 2345 6789',
          email: 'eventos@latradicion.com',
          notas: 'Capacidad para 200 personas',
        },
        activo: true,
      },
      {
        nombre: 'Seguros Viajero Seguro',
        categoria: 'otros',
        descripcion: 'Seguros de viaje con cobertura internacional',
        contacto: {
          telefono: '+52 55 5555 1234',
          email: 'contacto@viajeroseguro.com',
        },
        activo: true,
      },
    ];

    mockProviders.forEach(provider => addProvider(provider));
  }

  return {
    // State
    providers,
    loading,
    error,
    // Getters
    allProviders,
    activeProviders,
    getProviderById,
    getProvidersByCategory,
    statsByCategory,
    totalProviders,
    // Actions
    addProvider,
    updateProvider,
    deleteProvider,
    toggleProviderStatus,
    loadMockData,
  };
}, {
  persist: {
    key: 'viajeros-ligeros-providers',
    storage: import.meta.client ? localStorage : undefined,
  },
});
