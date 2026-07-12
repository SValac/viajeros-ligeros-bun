import type { DropdownMenuItem } from '@nuxt/ui';

import type { Provider, ProviderCategory, ProviderFilters, ProviderFormData } from '~/types/provider';

export function useProviderCategoryList(category: ProviderCategory, detailRoute?: (provider: Provider) => string) {
  const providerStore = useProviderStore();
  const toast = useToast();
  const router = useRouter();

  const isFormModalOpen = ref(false);
  const editingProvider = ref<Provider | null>(null);
  const localFilters = ref<ProviderFilters>({});

  const categoryProviders = computed(() => providerStore.getProvidersByCategory(category));

  const providers = computed(() => {
    let result = [...categoryProviders.value];

    if (localFilters.value.city) {
      result = result.filter(
        p => p.location.city.toLowerCase() === localFilters.value.city!.toLowerCase(),
      );
    }
    if (localFilters.value.state) {
      result = result.filter(
        p => p.location.state.toLowerCase() === localFilters.value.state!.toLowerCase(),
      );
    }
    if (localFilters.value.searchTerm) {
      const term = localFilters.value.searchTerm.toLowerCase();
      result = result.filter(
        p =>
          p.name.toLowerCase().includes(term)
          || p.description?.toLowerCase().includes(term)
          || p.contact.name?.toLowerCase().includes(term),
      );
    }

    return result;
  });

  const availableCiudades = computed(() =>
    [...new Set(categoryProviders.value.map(p => p.location.city))].sort(),
  );
  const availableEstados = computed(() =>
    [...new Set(categoryProviders.value.map(p => p.location.state))].sort(),
  );

  const hasLocalFilters = computed(() =>
    Object.values(localFilters.value).some(v => v !== undefined && v !== ''),
  );

  function removeLocalFilter(key: keyof ProviderFilters) {
    const updated = { ...localFilters.value };
    delete updated[key];
    localFilters.value = updated;
  }

  function clearLocalFilters() {
    localFilters.value = {};
  }

  function openCreateModal() {
    editingProvider.value = null;
    isFormModalOpen.value = true;
  }

  function openEditModal(provider: Provider) {
    editingProvider.value = provider;
    isFormModalOpen.value = true;
  }

  function closeModal() {
    isFormModalOpen.value = false;
    editingProvider.value = null;
  }

  async function handleFormSubmit(data: ProviderFormData) {
    try {
      data.category = category;

      if (editingProvider.value) {
        const success = await providerStore.updateProvider(editingProvider.value.id, data);
        if (success) {
          toast.add({ title: 'Proveedor actualizado', description: `${data.name} se actualizó correctamente`, color: 'primary' });
          closeModal();
        }
      }
      else {
        await providerStore.addProvider(data);
        toast.add({ title: 'Proveedor creado', description: `${data.name} se creó correctamente`, color: 'primary' });
        closeModal();
      }
    }
    catch {
      toast.add({ title: 'Error', description: 'Ocurrió un error al guardar el proveedor', color: 'error' });
    }
  }

  async function handleDelete(provider: Provider) {
    // eslint-disable-next-line no-alert
    if (confirm(`¿Estás seguro de eliminar ${provider.name}?`)) {
      const success = await providerStore.deleteProvider(provider.id);
      if (success) {
        toast.add({ title: 'Proveedor eliminado', description: `${provider.name} se eliminó correctamente`, color: 'warning' });
      }
    }
  }

  async function handleToggleStatus(provider: Provider) {
    const success = await providerStore.toggleProviderStatus(provider.id);
    if (success) {
      const newStatus = !provider.active;
      toast.add({
        title: 'Estado actualizado',
        description: `${provider.name} ahora está ${newStatus ? 'activo' : 'inactivo'}`,
        color: 'primary',
      });
    }
  }

  function getRowActions(provider: Provider): DropdownMenuItem[][] {
    const primary: DropdownMenuItem[] = [];

    if (detailRoute) {
      primary.push({
        label: 'Ver detalles',
        icon: 'i-lucide-arrow-right',
        onSelect: () => router.push(detailRoute(provider)),
      });
    }

    primary.push(
      {
        label: 'Editar',
        icon: 'i-lucide-pencil',
        onSelect: () => openEditModal(provider),
      },
      {
        label: provider.active ? 'Desactivar' : 'Activar',
        icon: provider.active ? 'i-lucide-eye-off' : 'i-lucide-eye',
        onSelect: () => handleToggleStatus(provider),
      },
    );

    return [
      primary,
      [
        {
          label: 'Eliminar',
          icon: 'i-lucide-trash-2',
          onSelect: () => handleDelete(provider),
        },
      ],
    ];
  }

  const headerCreateButtonLabel = 'Nuevo Proveedor';
  const emptyStateButtonLabel = 'Agregar Proveedor';
  const modalCreateTitle = 'Nuevo Proveedor';
  const modalEditTitle = 'Editar Proveedor';
  const modalDescription = computed(() =>
    `Complete los campos para ${editingProvider.value ? 'editar' : 'crear'} el proveedor.`,
  );
  const countText = computed(() => {
    const n = providers.value.length;
    const plural = n !== 1;
    return `${n} proveedor${plural ? 'es' : ''} ${plural ? 'registrados' : 'registrado'}`;
  });
  const emptyStateTitle = 'No hay proveedores registrados aún';
  const emptyStateDescription = 'Comienza agregando tu primer proveedor';

  return {
    isFormModalOpen,
    editingProvider,
    localFilters,
    categoryProviders,
    providers,
    availableCiudades,
    availableEstados,
    hasLocalFilters,
    removeLocalFilter,
    clearLocalFilters,
    openCreateModal,
    openEditModal,
    closeModal,
    handleFormSubmit,
    handleDelete,
    handleToggleStatus,
    getRowActions,
    headerCreateButtonLabel,
    emptyStateButtonLabel,
    modalCreateTitle,
    modalEditTitle,
    modalDescription,
    countText,
    emptyStateTitle,
    emptyStateDescription,
  };
}
