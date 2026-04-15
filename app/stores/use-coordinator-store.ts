import type { Coordinator, CoordinatorFormData, CoordinatorUpdateData } from '~/types/coordinator';

export const useCoordinatorStore = defineStore('useCoordinatorStore', () => {
  // State
  const coordinators = ref<Coordinator[]>([]);
  const loading = shallowRef(false);
  const error = shallowRef<string | null>(null);

  // Getters
  const allCoordinators = computed((): Coordinator[] => {
    return [...coordinators.value].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  });

  const getCoordinatorById = computed(() => {
    return (id: string): Coordinator | undefined => {
      return coordinators.value.find(c => c.id === id);
    };
  });

  // Actions
  function addCoordinator(data: CoordinatorFormData): Coordinator {
    const now = new Date().toISOString();
    const newCoordinator: Coordinator = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    coordinators.value.push(newCoordinator);
    error.value = null;
    return newCoordinator;
  }

  function updateCoordinator(id: string, data: CoordinatorUpdateData): Coordinator | undefined {
    const index = coordinators.value.findIndex(c => c.id === id);
    if (index === -1) {
      error.value = 'Coordinador no encontrado';
      return undefined;
    }

    const existing = coordinators.value[index];
    if (!existing) {
      error.value = 'Coordinador no encontrado';
      return undefined;
    }

    const updated: Coordinator = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    coordinators.value[index] = updated;
    error.value = null;
    return updated;
  }

  function deleteCoordinator(id: string): void {
    const index = coordinators.value.findIndex(c => c.id === id);
    if (index === -1) {
      error.value = 'Coordinador no encontrado';
      return;
    }

    coordinators.value.splice(index, 1);
    error.value = null;
  }

  return {
    // State
    coordinators,
    loading,
    error,
    // Getters
    allCoordinators,
    getCoordinatorById,
    // Actions
    addCoordinator,
    updateCoordinator,
    deleteCoordinator,
  };
}, {
  persist: {
    key: 'viajeros-ligeros-coordinators',
    storage: import.meta.client ? localStorage : undefined,
  },
});
