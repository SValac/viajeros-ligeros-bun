<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';

import type { TravelService } from '~/types/travel';

import { useEditableList } from '~/composables/use-editable-list';
import { useFormModal } from '~/composables/use-form-modal';
import { deleteAction } from '~/utils/actions-column';
import { pluralize } from '~/utils/pluralize';

// Public "qué incluye" list of a travel, shown on the web. Each change is saved right away.
type Props = {
  services: TravelService[];
  travelId: string;
};

const props = defineProps<Props>();

const travelsStore = useTravelsStore();
const confirmDelete = useConfirmDelete();
const toast = useToast();

const { isOpen: isServiceModalOpen, editing: editingService, openNew: openServiceAddModal, openEdit: openEditModal } = useFormModal<TravelService>();

const { items: services, isSaving, upsert, patch, remove } = useEditableList(() => props.services, async (services) => {
  const saved = await travelsStore.updateTravel(props.travelId, { services });
  toast.add(saved
    ? { title: 'Servicios guardados', color: 'success', icon: 'i-lucide-check-circle' }
    : { title: 'Error al guardar servicios', description: travelsStore.error ?? undefined, color: 'error', icon: 'i-lucide-alert-circle' });
  return saved;
});

// Included ones first, each group keeping its order
const sortedServices = computed(() => [
  ...services.value.filter(s => s.included),
  ...services.value.filter(s => !s.included),
]);

const includedCount = computed(() => services.value.filter(s => s.included).length);
const notIncludedCount = computed(() => services.value.length - includedCount.value);

function closeServiceModal() {
  isServiceModalOpen.value = false;
}

async function handleSubmit(serviceData: Omit<TravelService, 'id'>) {
  if (await upsert(serviceData, editingService.value))
    isServiceModalOpen.value = false;
}

function toggleIncluded(service: TravelService) {
  patch(service.id, { included: !service.included });
}

async function handleDelete(service: TravelService) {
  if (!(await confirmDelete({
    title: 'Eliminar servicio',
    description: `¿Eliminar “${service.name}”? Dejará de mostrarse en la web.`,
  }))) {
    return;
  }

  await remove(service.id);
}

function getServiceActions(service: TravelService): DropdownMenuItem[][] {
  return [
    [
      {
        label: service.included ? 'Marcar como no incluido' : 'Marcar como incluido',
        icon: service.included ? 'i-lucide-circle-x' : 'i-lucide-circle-check',
        onSelect: () => toggleIncluded(service),
      },
      {
        label: 'Editar',
        icon: 'i-lucide-pencil',
        onSelect: () => openEditModal(service),
      },
    ],
    [
      deleteAction(() => handleDelete(service)),
    ],
  ];
}
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2 text-sm">
          <UBadge
            :label="pluralize(includedCount, 'incluido')"
            color="success"
            variant="subtle"
          />
          <UBadge
            v-if="notIncludedCount > 0"
            :label="pluralize(notIncludedCount, 'no incluido', 'no incluidos')"
            color="neutral"
            variant="subtle"
          />
        </div>
        <UButton
          icon="i-lucide-plus"
          size="sm"
          label="Agregar servicio"
          @click="openServiceAddModal"
        />
      </div>
    </template>

    <ul v-if="services.length > 0" class="divide-y divide-default">
      <li
        v-for="service in sortedServices"
        :key="service.id"
        class="flex items-center gap-3 px-4 py-3"
      >
        <UIcon
          :name="service.included ? 'i-lucide-circle-check' : 'i-lucide-circle-x'"
          class="size-5 shrink-0"
          :class="service.included ? 'text-success' : 'text-dimmed'"
        />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium" :class="{ 'text-muted': !service.included }">
            {{ service.name }}
          </p>
          <p v-if="service.description" class="truncate text-xs text-muted">
            {{ service.description }}
          </p>
        </div>
        <UDropdownMenu :items="getServiceActions(service)">
          <UButton
            icon="i-lucide-ellipsis-vertical"
            variant="ghost"
            color="neutral"
            size="sm"
            :aria-label="`Acciones de ${service.name}`"
          />
        </UDropdownMenu>
      </li>
    </ul>

    <EmptyState v-else section="services" />

    <!-- Modal: add / edit -->
    <UModal
      v-model:open="isServiceModalOpen"
      :title="editingService ? 'Editar servicio' : 'Nuevo servicio'"
    >
      <template #body>
        <TravelServiceForm
          :service="editingService"
          :loading="isSaving"
          @submit="handleSubmit"
          @cancel="closeServiceModal"
        />
      </template>
    </UModal>
  </UCard>
</template>
