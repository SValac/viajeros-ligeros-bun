<script setup lang="ts">
import type { TravelActivity } from '~/types/travel';

import { useFormModal } from '~/composables/use-form-modal';
import { pluralize } from '~/utils/pluralize';
import { getTravelDurationDays } from '~/utils/travel-calendar';

// Props
type Props = {
  modelValue: TravelActivity[];
  startDate: string;
  endDate: string;
  travelId?: string;
};

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  'update:modelValue': [activities: TravelActivity[]];
}>();

const travelsStore = useTravelsStore();

// Local state
const activities = ref<TravelActivity[]>([...props.modelValue]);
const { isOpen: isActivityModalOpen, editing: editingActivity, openNew: openActivityAddModal, openEdit: openEditModal } = useFormModal<TravelActivity>();

// Toast for feedback
const toast = useToast();

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

// Handlers
async function persistActivities(nextActivities: TravelActivity[]): Promise<boolean> {
  if (!props.travelId) {
    activities.value = nextActivities;
    emit('update:modelValue', activities.value);
    return true;
  }

  const previousActivities = [...activities.value];
  activities.value = nextActivities;
  emit('update:modelValue', activities.value);

  const saved = await travelsStore.updateTravel(props.travelId, { itinerary: nextActivities });
  if (!saved) {
    activities.value = previousActivities;
    emit('update:modelValue', activities.value);
    toast.add({
      title: 'Error al guardar',
      description: travelsStore.error ?? 'No se pudo guardar el itinerario',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    });
    return false;
  }

  return true;
}

async function handleSubmit(activityData: Omit<TravelActivity, 'id'>) {
  let nextActivities = [...activities.value];

  if (editingActivity.value) {
    // Edit an existing activity
    const index = activities.value.findIndex(a => a.id === editingActivity.value!.id);
    if (index !== -1) {
      nextActivities[index] = {
        ...activityData,
        id: editingActivity.value.id,
      };
    }
  }
  else {
    // Add a new activity
    const newActivity: TravelActivity = {
      ...activityData,
      id: crypto.randomUUID(),
    };
    nextActivities = [...nextActivities, newActivity];
  }

  const saved = await persistActivities(nextActivities);
  if (!saved)
    return;

  toast.add({
    title: editingActivity.value ? 'Actividad actualizada' : 'Actividad agregada',
    color: 'success',
    icon: 'i-lucide-check-circle',
  });
  isActivityModalOpen.value = false;
}

async function deleteActivity(activity: TravelActivity) {
  // eslint-disable-next-line no-alert
  if (confirm(`¿Eliminar la actividad "${activity.title}"?`)) {
    const nextActivities = activities.value.filter(a => a.id !== activity.id);
    const saved = await persistActivities(nextActivities);
    if (!saved)
      return;

    toast.add({
      title: 'Actividad eliminada',
      color: 'success',
      icon: 'i-lucide-trash-2',
    });
  }
}

// Sync with the prop when it changes from outside
watch(() => props.modelValue, (newVal) => {
  activities.value = [...newVal];
}, { deep: true });

// Actions per activity
function getActivityActions(activity: TravelActivity) {
  return [
    {
      label: 'Editar',
      icon: 'i-lucide-pencil',
      onSelect: () => openEditModal(activity),
    },
    {
      label: 'Eliminar',
      icon: 'i-lucide-trash-2',
      color: 'error' as const,
      onSelect: () => deleteActivity(activity),
    },
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
          @submit="handleSubmit"
          @cancel="isActivityModalOpen = false"
        />
      </template>
    </UModal>
  </div>
</template>
