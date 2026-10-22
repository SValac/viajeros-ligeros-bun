import type { DropdownMenuItem } from '@nuxt/ui';

import type { Provider, ProviderCategory, ProviderFilters, ProviderFormData } from '~/types/provider';

import { matchesProviderSearch } from '~/composables/providers/use-provider-domain';
import { useActionToast } from '~/composables/use-action-toast';
import { deleteAction } from '~/utils/actions-column';

export function useProviderCategoryList(category: ProviderCategory, detailRoute?: (provider: Provider) => string) {
  const providerStore = useProviderStore();
  const { runWithToast } = useActionToast();
  const router = useRouter();
  const confirmDelete = useConfirmDelete();

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
      const term = localFilters.value.searchTerm;
      result = result.filter(p => matchesProviderSearch(p, term));
    }

    return result;
  });

  const availableCities = computed(() =>
    [...new Set(categoryProviders.value.map(p => p.location.city))].sort(),
  );
  const availableStates = computed(() =>
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
    data.category = category;
    const editing = editingProvider.value;
    if (await runWithToast(() => (editing ? providerStore.updateProvider(editing.id, data) : providerStore.addProvider(data)), {
      success: editing
        ? { title: 'Proveedor actualizado', description: `${data.name} se actualizó correctamente`, color: 'primary' }
        : { title: 'Proveedor creado', description: `${data.name} se creó correctamente`, color: 'primary' },
      error: 'Error',
      errorFallback: 'Ocurrió un error al guardar el proveedor',
    })) {
      closeModal();
    }
  }

  async function handleDelete(provider: Provider) {
    if (await confirmDelete({
      title: 'Eliminar proveedor',
      description: `¿Estás seguro de eliminar ${provider.name}?`,
    })) {
      await runWithToast(() => providerStore.deleteProvider(provider.id), {
        success: { title: 'Proveedor eliminado', description: `${provider.name} se eliminó correctamente`, color: 'warning' },
        error: 'Error',
        errorFallback: 'No se pudo eliminar el proveedor',
      });
    }
  }

  async function handleToggleStatus(provider: Provider) {
    const newStatus = !provider.active;
    await runWithToast(() => providerStore.toggleProviderStatus(provider.id), {
      success: {
        title: 'Estado actualizado',
        description: `${provider.name} ahora está ${newStatus ? 'activo' : 'inactivo'}`,
        color: 'primary',
      },
      error: 'Error',
      errorFallback: 'No se pudo cambiar el estado del proveedor',
    });
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
        deleteAction(() => handleDelete(provider)),
      ],
    ];
  }

  const headerCreateButtonLabel = 'Nuevo Proveedor';
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

  return {
    isFormModalOpen,
    editingProvider,
    localFilters,
    categoryProviders,
    providers,
    availableCities,
    availableStates,
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
    modalCreateTitle,
    modalEditTitle,
    modalDescription,
    countText,
  };
}
