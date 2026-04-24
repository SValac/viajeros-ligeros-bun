<script setup lang="ts">
import type { TravelActivity } from '~/types/travel';

// Props
type Props = {
  modelValue: TravelActivity[];
  startDate: string;
  endDate: string;
};

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  'update:modelValue': [activities: TravelActivity[]];
}>();

// Estado local
const activities = ref<TravelActivity[]>([...props.modelValue]);
const isActivityModalOpen = ref(false);
const editingActivity = ref<TravelActivity | null>(null);

// Toast para feedback
const toast = useToast();

// Calcular duración del viaje en días
const duracionViaje = computed(() => {
  if (!props.startDate || !props.endDate)
    return 0;
  const inicio = new Date(props.startDate);
  const fin = new Date(props.endDate);
  const diff = fin.getTime() - inicio.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir ambos días
});

// Actividades ordenadas por día
const sortedActivities = computed(() => {
  return [...activities.value].sort((a, b) => a.day - b.day);
});

// Handlers
function openActivityAddModal() {
  editingActivity.value = null;
  isActivityModalOpen.value = true;
}

function openEditModal(activity: TravelActivity) {
  editingActivity.value = activity;
  isActivityModalOpen.value = true;
}

function handleSubmit(activityData: Omit<TravelActivity, 'id'>) {
  if (editingActivity.value) {
    // Editar actividad existente
    const index = activities.value.findIndex(a => a.id === editingActivity.value!.id);
    if (index !== -1) {
      activities.value[index] = {
        ...activityData,
        id: editingActivity.value.id,
      };

      toast.add({
        title: 'Actividad actualizada',
        color: 'success',
        icon: 'i-lucide-check-circle',
      });
    }
  }
  else {
    // Agregar nueva actividad
    const newActivity: TravelActivity = {
      ...activityData,
      id: crypto.randomUUID(),
    };
    activities.value.push(newActivity);

    toast.add({
      title: 'Actividad agregada',
      color: 'success',
      icon: 'i-lucide-check-circle',
    });
  }

  emit('update:modelValue', activities.value);
  isActivityModalOpen.value = false;
}

function deleteActivity(activity: TravelActivity) {
  // eslint-disable-next-line no-alert
  if (confirm(`¿Eliminar la actividad "${activity.title}"?`)) {
    activities.value = activities.value.filter(a => a.id !== activity.id);
    emit('update:modelValue', activities.value);

    toast.add({
      title: 'Actividad eliminada',
      color: 'success',
      icon: 'i-lucide-trash-2',
    });
  }
}

// Sincronizar con prop cuando cambia externamente
watch(() => props.modelValue, (newVal) => {
  activities.value = [...newVal];
}, { deep: true });

// Acciones por actividad
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

// Formatear hora
function formatHora(hora?: string) {
  if (!hora)
    return '';
  return hora;
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header con botón agregar -->
    <div class="flex items-center justify-between">
      <div class="text-sm text-muted">
        {{ sortedActivities.length }} actividad{{ sortedActivities.length !== 1 ? 'es' : '' }}
        {{ duracionViaje > 0 ? `en ${duracionViaje} día${duracionViaje !== 1 ? 's' : ''}` : '' }}
      </div>
      <UButton
        icon="i-lucide-plus"
        size="sm"
        label="Agregar Actividad"
        @click="openActivityAddModal"
      />
    </div>

    <!-- Lista de actividades -->
    <div
      v-if="sortedActivities.length > 0"
      class="space-y-3"
    >
      <UCard
        v-for="activity in sortedActivities"
        :key="activity.id"
        class="hover:bg-elevated transition-colors"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 space-y-2">
            <!-- Día y hora -->
            <div class="flex items-center gap-2 text-sm text-muted">
              <span class="i-lucide-calendar-days w-4 h-4" />
              <span class="font-medium">Día {{ activity.day }}</span>
              <span
                v-if="activity.time"
                class="flex items-center gap-1"
              >
                <span class="i-lucide-clock w-3.5 h-3.5" />
                {{ formatHora(activity.time) }}
              </span>
            </div>

            <!-- Título -->
            <div class="font-medium text-base">
              {{ activity.title }}
            </div>

            <!-- Descripción -->
            <div class="text-sm text-muted">
              {{ activity.description }}
            </div>

            <!-- Ubicación -->
            <div
              v-if="activity.location"
              class="flex items-center gap-1.5 text-sm text-muted"
            >
              <span class="i-lucide-map-pin w-3.5 h-3.5" />
              {{ activity.location }}
            </div>
          </div>

          <!-- Acciones -->
          <UDropdownMenu :items="getActivityActions(activity)">
            <UButton
              icon="i-lucide-more-vertical"
              variant="ghost"
              color="neutral"
              size="sm"
            />
          </UDropdownMenu>
        </div>
      </UCard>
    </div>

    <!-- Estado vacío -->
    <div
      v-else
      class="text-center py-8 text-muted"
    >
      <Icon
        name="i-lucide-calendar-days"
        class="w-12 h-12 mx-auto mb-3 opacity-50"
      />
      <p class="text-sm">
        No hay actividades en el itinerario
      </p>
      <p class="text-xs mt-1">
        Haz clic en "Agregar Actividad" para comenzar
      </p>
    </div>

    <!-- Modal de formulario -->
    <UModal
      v-model:open="isActivityModalOpen"
      :title="editingActivity ? 'Editar Actividad' : 'Nueva Actividad'"
    >
      <template #body>
        <TravelActivityForm
          :activity="editingActivity"
          :max-dia="duracionViaje"
          @submit="handleSubmit"
          @cancel="isActivityModalOpen = false"
        />
      </template>
    </UModal>
  </div>
</template>
