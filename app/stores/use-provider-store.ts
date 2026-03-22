import { defineStore } from 'pinia';

import type { Provider, ProviderCategory, ProviderFilters, ProviderFormData, ProviderUpdateData } from '~/types/provider';

export const useProviderStore = defineStore('providers', () => {
  // State
  const providers = ref<Provider[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const activeFilters = ref<ProviderFilters>({});

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

  const filteredProviders = computed(() => {
    let result = [...providers.value];

    if (activeFilters.value.activo !== undefined) {
      result = result.filter(p => p.activo === activeFilters.value.activo);
    }
    else {
      result = result.filter(p => p.activo);
    }

    if (activeFilters.value.categoria) {
      result = result.filter(p => p.categoria === activeFilters.value.categoria);
    }

    if (activeFilters.value.ciudad) {
      result = result.filter(
        p => p.ubicacion.ciudad.toLowerCase() === activeFilters.value.ciudad!.toLowerCase(),
      );
    }

    if (activeFilters.value.estado) {
      result = result.filter(
        p => p.ubicacion.estado.toLowerCase() === activeFilters.value.estado!.toLowerCase(),
      );
    }

    if (activeFilters.value.searchTerm) {
      const term = activeFilters.value.searchTerm.toLowerCase();
      result = result.filter(
        p =>
          p.nombre.toLowerCase().includes(term)
          || p.descripcion?.toLowerCase().includes(term)
          || p.contacto.nombre?.toLowerCase().includes(term),
      );
    }

    return result.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  });

  const availableCiudades = computed(() =>
    [...new Set(providers.value.filter(p => p.activo).map(p => p.ubicacion.ciudad))].sort(),
  );

  const availableEstados = computed(() =>
    [...new Set(providers.value.filter(p => p.activo).map(p => p.ubicacion.estado))].sort(),
  );

  const filteredCount = computed(() => filteredProviders.value.length);

  const hasActiveFilters = computed(() =>
    Object.values(activeFilters.value).some(v => v !== undefined && v !== ''),
  );

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

  // Filter actions
  function setFilters(filters: ProviderFilters): void {
    activeFilters.value = { ...filters };
  }

  function updateFilter<K extends keyof ProviderFilters>(key: K, value: ProviderFilters[K]): void {
    activeFilters.value = { ...activeFilters.value, [key]: value };
  }

  function removeFilter(key: keyof ProviderFilters): void {
    const updated = { ...activeFilters.value };
    delete updated[key];
    activeFilters.value = updated;
  }

  function clearFilters(): void {
    activeFilters.value = {};
  }

  function loadMockData(): void {
    if (providers.value.length > 0)
      return;

    const mockProviders: ProviderFormData[] = [
      {
        nombre: 'Guías Expertos México',
        categoria: 'guias',
        descripcion: 'Guías certificados con amplia experiencia en turismo cultural',
        ubicacion: {
          ciudad: 'Ciudad de México',
          estado: 'CDMX',
          pais: 'México',
        },
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
        ubicacion: {
          ciudad: 'Monterrey',
          estado: 'Nuevo León',
          pais: 'México',
        },
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
        ubicacion: {
          ciudad: 'Cancún',
          estado: 'Quintana Roo',
          pais: 'México',
        },
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
        ubicacion: {
          ciudad: 'Guadalajara',
          estado: 'Jalisco',
          pais: 'México',
        },
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
        ubicacion: {
          ciudad: 'Ciudad de México',
          estado: 'CDMX',
          pais: 'México',
        },
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
        ubicacion: {
          ciudad: 'Ciudad de México',
          estado: 'CDMX',
          pais: 'México',
        },
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
    activeFilters,
    // Getters
    allProviders,
    activeProviders,
    getProviderById,
    getProvidersByCategory,
    statsByCategory,
    totalProviders,
    filteredProviders,
    availableCiudades,
    availableEstados,
    filteredCount,
    hasActiveFilters,
    // Actions
    addProvider,
    updateProvider,
    deleteProvider,
    toggleProviderStatus,
    loadMockData,
    setFilters,
    updateFilter,
    removeFilter,
    clearFilters,
  };
}, {
  persist: {
    key: 'viajeros-ligeros-providers',
    storage: import.meta.client ? localStorage : undefined,
    pick: ['providers'],
  },
});
