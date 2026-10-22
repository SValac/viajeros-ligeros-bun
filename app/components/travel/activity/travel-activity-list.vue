<script setup lang="ts">
import type { TravelActivity } from '~/types/travel';

import { useEditableList } from '~/composables/use-editable-list';
import { useFormModal } from '~/composables/use-form-modal';
import { deleteAction } from '~/utils/actions-column';
import { pluralize } from '~/utils/pluralize';
import { getTravelDurationDays } from '~/utils/travel-calendar';

// Itinerary of a travel. Each change is saved right away.
type Props = {
  activities: TravelActivity[];
  startDate: string;
  endDate: string;
  travelId: string;
};

const props = defineProps<Props>();

const travelsStore = useTravelsStore();
const confirmDelete = useConfirmDelete();
const toast = useToast();

const { isOpen: isActivityModalOpen, editing: editingActivity, openNew: openActivityAddModal, openEdit: openEditModal } = useFormModal<TravelActivity>();

const { items: activities, isSaving, upsert, remove } = useEditableList(() => props.activities, async (itinerary) => {
  const saved = await travelsStore.updateTravel(props.travelId, { itinerary });
  if (!saved) {
    toast.add({
      title: 'Error al guardar',
      description: travelsStore.error ?? 'No se pudo guardar el itinerario',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    });
  }
  return saved;
});

// Travel duration in days
const travelDuration = computed(() => {
  if (!props.startDate || !props.endDate)
    return 0;
  return getTravelDurationDays(props);
});

// Activities sorted by day
const sortedActivities = computed(() => {
  return [...activities.value].sort((a, b) => a.day - b.day);
});

async function handleSubmit(activityData: Omit<TravelActivity, 'id'>) {
  if (!(await upsert(activityData, editingActivity.value)))
    return;

  toast.add({
    title: editingActivity.value ? 'Actividad actualizada' : 'Actividad agregada',
    color: 'success',
    icon: 'i-lucide-check-circle',
  });
  isActivityModalOpen.value = false;
}

async function deleteActivity(activity: TravelActivity) {
  if (!(await confirmDelete({
    title: 'Eliminar actividad',
    description: `¿Estás seguro de eliminar la actividad "${activity.title}"?`,
  }))) {
    return;
  }

  if (await remove(activity.id)) {
    toast.add({
      title: 'Actividad eliminada',
      color: 'success',
      icon: 'i-lucide-trash-2',
    });
  }
}

// Actions per activity
function getActivityActions(activity: TravelActivity) {
  return [
    {
      label: 'Editar',
      icon: 'i-lucide-pencil',
      onSelect: () => openEditModal(activity),
    },
    deleteAction(() => deleteActivity(activity)),
  ];
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header with the add button -->
    <div class="flex items-center justify-between">
      <div class="text-sm text-muted">
        {{ pluralize(sortedActivities.length, 'actividad') }}
        {{ travelDuration > 0 ? `en ${pluralize(travelDuration, 'día')}` : '' }}
      </div>
      <UButton
        icon="i-lucide-plus"
        size="sm"
        label="Agregar Actividad"
        @click="openActivityAddModal"
      />
    </div>

    <!-- Activity list -->
    <div
      v-if="sortedActivities.length > 0"
      class="space-y-3"
    >
      <TravelActivityCard
        v-for="activity in sortedActivities"
        :key="activity.id"
        :activity="activity"
      >
        <template #actions>
          <UDropdownMenu :items="getActivityActions(activity)">
            <UButton
              icon="i-lucide-more-vertical"
              variant="ghost"
              color="neutral"
              size="sm"
              :aria-label="`Acciones de ${activity.title}`"
            />
          </UDropdownMenu>
        </template>
      </TravelActivityCard>
    </div>

    <!-- Empty state -->
    <EmptyState v-else section="activities" />

    <!-- Form modal -->
    <UModal
      v-model:open="isActivityModalOpen"
      :title="editingActivity ? 'Editar Actividad' : 'Nueva Actividad'"
      :description="editingActivity ? 'Modifique los detalles de la actividad' : 'Complete los detalles de la nueva actividad'"
      :dismissible="false"
    >
      <template #body>
        <TravelActivityForm
          :activity="editingActivity"
          :max-day="travelDuration"
          :loading="isSaving"
          @submit="handleSubmit"
          @cancel="isActivityModalOpen = false"
        />
      </template>
    </UModal>
  </div>
</template>
