<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';

import type { TravelService } from '~/types/travel';

// Public "qué incluye" list of a travel, shown on the web. Emits the whole list on every
// change; the parent persists it and reports the result (so there's a single toast).
type Props = {
  modelValue: TravelService[];
  editable?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  editable: true,
});

const emit = defineEmits<{
  'update:modelValue': [services: TravelService[]];
}>();

const services = ref<TravelService[]>([...props.modelValue]);
const isServiceModalOpen = shallowRef(false);
const editingService = shallowRef<TravelService | null>(null);
const serviceToDelete = shallowRef<TravelService | null>(null);
const isDeleteModalOpen = shallowRef(false);

// Included ones first, each group keeping its order
const sortedServices = computed(() => [
  ...services.value.filter(s => s.included),
  ...services.value.filter(s => !s.included),
]);

const includedCount = computed(() => services.value.filter(s => s.included).length);
const notIncludedCount = computed(() => services.value.length - includedCount.value);

watch(() => props.modelValue, (newVal) => {
  services.value = [...newVal];
}, { deep: true });

function emitServices() {
  emit('update:modelValue', services.value);
}

function openServiceAddModal() {
  editingService.value = null;
  isServiceModalOpen.value = true;
}

function openEditModal(service: TravelService) {
  editingService.value = service;
  isServiceModalOpen.value = true;
}

function closeServiceModal() {
  isServiceModalOpen.value = false;
}

function handleSubmit(serviceData: Omit<TravelService, 'id'>) {
  const editing = editingService.value;
  if (editing) {
    services.value = services.value.map(s => (s.id === editing.id ? { ...serviceData, id: editing.id } : s));
  }
  else {
    services.value = [...services.value, { ...serviceData, id: crypto.randomUUID() }];
  }

  emitServices();
  isServiceModalOpen.value = false;
}

function toggleIncluded(service: TravelService) {
  services.value = services.value.map(s => (s.id === service.id ? { ...s, included: !s.included } : s));
  emitServices();
}

function openDeleteModal(service: TravelService) {
  serviceToDelete.value = service;
  isDeleteModalOpen.value = true;
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false;
}

function confirmDelete() {
  const service = serviceToDelete.value;
  if (!service)
    return;
  services.value = services.value.filter(s => s.id !== service.id);
  emitServices();
  isDeleteModalOpen.value = false;
  serviceToDelete.value = null;
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
      {
        label: 'Eliminar',
        icon: 'i-lucide-trash-2',
        color: 'error',
        onSelect: () => openDeleteModal(service),
      },
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
            :label="`${includedCount} incluido${includedCount === 1 ? '' : 's'}`"
            color="success"
            variant="subtle"
          />
          <UBadge
            v-if="notIncludedCount > 0"
            :label="`${notIncludedCount} no incluido${notIncludedCount === 1 ? '' : 's'}`"
            color="neutral"
            variant="subtle"
          />
        </div>
        <UButton
          v-if="editable"
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
        <UDropdownMenu v-if="editable" :items="getServiceActions(service)">
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

    <div v-else class="px-4 py-10 text-center text-muted">
      <UIcon name="i-lucide-package" class="mx-auto mb-2 size-10 opacity-50" />
      <p class="text-sm">
        No hay servicios agregados
      </p>
      <p v-if="editable" class="mt-1 text-xs">
        Agrega lo que incluye (o no incluye) el viaje; se muestra en la web.
      </p>
    </div>

    <!-- Modal: agregar / editar -->
    <UModal
      v-model:open="isServiceModalOpen"
      :title="editingService ? 'Editar servicio' : 'Nuevo servicio'"
    >
      <template #body>
        <TravelServiceForm
          :service="editingService"
          @submit="handleSubmit"
          @cancel="closeServiceModal"
        />
      </template>
    </UModal>

    <!-- Modal: eliminar -->
    <UModal
      v-model:open="isDeleteModalOpen"
      title="Eliminar servicio"
      :description="serviceToDelete ? `¿Eliminar “${serviceToDelete.name}”? Dejará de mostrarse en la web.` : ''"
    >
      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <UButton
            variant="ghost"
            color="neutral"
            label="Cancelar"
            @click="closeDeleteModal"
          />
          <UButton
            color="error"
            label="Eliminar"
            @click="confirmDelete"
          />
        </div>
      </template>
    </UModal>
  </UCard>
</template>
