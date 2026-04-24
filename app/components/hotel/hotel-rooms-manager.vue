<script setup lang="ts">
import type { HotelRoomType, HotelRoomTypeFormData, RoomTypesByOccupancy } from '~/types/hotel-room';
import type { Provider } from '~/types/provider';

import HotelRoomTypeCard from '~/components/hotel/hotel-room-type-card.vue';
import HotelRoomTypeForm from '~/components/hotel/hotel-room-type-form.vue';
import { useHotelRoomStore } from '~/stores/use-hotel-room-store';

const props = defineProps<{
  provider: Provider;
}>();

defineEmits<{
  close: [];
}>();

const store = useHotelRoomStore();
const toast = useToast();

const totalRoomsInput = ref(0);
const isFormModalOpen = ref(false);
const editingRoomType = ref<HotelRoomType | null>(null);

const isEditing = computed(() => !!editingRoomType.value);
const roomData = computed(() => store.getRoomDataByProviderId(props.provider.id));
const roomTypes = computed(() => roomData.value?.roomTypes ?? []);
const usedRooms = computed(() => store.getUsedRoomsByProvider(props.provider.id));
const hasOverflow = computed(() => usedRooms.value > totalRoomsInput.value);

const groupedByOccupancy = computed((): RoomTypesByOccupancy[] => {
  const map = new Map<number, RoomTypesByOccupancy>();

  for (const rt of roomTypes.value) {
    if (!map.has(rt.maxOccupancy)) {
      map.set(rt.maxOccupancy, { occupancy: rt.maxOccupancy, totalRooms: 0, types: [] });
    }
    const group = map.get(rt.maxOccupancy)!;
    group.types.push(rt);
    group.totalRooms += rt.roomCount;
  }

  return [...map.values()].sort((a, b) => a.occupancy - b.occupancy);
});

onMounted(() => {
  if (!store.hasRoomData(props.provider.id)) {
    store.initRoomData(props.provider.id, 0);
  }
  totalRoomsInput.value = store.getTotalRoomsByProvider(props.provider.id);
});

function updateTotalRooms() {
  const ok = store.updateTotalRooms(props.provider.id, totalRoomsInput.value);
  if (!ok) {
    toast.add({ title: 'Error', description: store.error ?? 'No se pudo actualizar el total', color: 'error' });
    totalRoomsInput.value = store.getTotalRoomsByProvider(props.provider.id);
  }
}

function openCreateForm() {
  editingRoomType.value = null;
  isFormModalOpen.value = true;
}

function openEditForm(rt: HotelRoomType) {
  editingRoomType.value = rt;
  isFormModalOpen.value = true;
}

function closeFormModal() {
  isFormModalOpen.value = false;
  editingRoomType.value = null;
}

function handleFormSubmit(data: HotelRoomTypeFormData) {
  if (isEditing.value && editingRoomType.value) {
    store.updateRoomType(props.provider.id, editingRoomType.value.id, data);
    toast.add({ title: 'Habitación actualizada', color: 'primary' });
  }
  else {
    store.addRoomType(props.provider.id, data);
    toast.add({ title: 'Habitación agregada', color: 'primary' });
  }
  closeFormModal();
}

function handleDelete(rt: HotelRoomType) {
  // eslint-disable-next-line no-alert
  if (confirm('¿Eliminar este tipo de habitación?')) {
    store.deleteRoomType(props.provider.id, rt.id);
    toast.add({ title: 'Habitación eliminada', color: 'warning' });
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-wrap justify-between items-start gap-4">
      <div>
        <h2 class="text-xl font-bold text-gray-900 dark:text-white">
          Habitaciones — {{ provider.name }}
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Gestiona los tipos de habitación del hotel
        </p>
      </div>
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
          Total habitaciones:
        </label>
        <UInput
          v-model.number="totalRoomsInput"
          type="number"
          :min="0"
          class="w-24"
          @blur="updateTotalRooms"
        />
        <UButton icon="i-lucide-plus" @click="openCreateForm">
          Agregar tipo
        </UButton>
      </div>
    </div>

    <!-- Overflow warning -->
    <UAlert
      v-if="hasOverflow"
      icon="i-lucide-alert-triangle"
      color="warning"
      variant="subtle"
      title="Exceso de habitaciones"
      :description="`La suma de habitaciones configuradas (${usedRooms}) supera el total declarado (${totalRoomsInput}).`"
    />

    <!-- Empty state -->
    <UCard v-if="roomTypes.length === 0">
      <div class="text-center py-12">
        <UIcon
          name="i-lucide-bed-single"
          class="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3"
        />
        <p class="font-medium text-gray-900 dark:text-white">
          Sin habitaciones configuradas
        </p>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Agrega el primer tipo de habitación
        </p>
        <UButton
          icon="i-lucide-plus"
          variant="outline"
          class="mt-4"
          @click="openCreateForm"
        >
          Agregar tipo
        </UButton>
      </div>
    </UCard>

    <!-- Grupos por ocupación -->
    <div v-else class="space-y-6">
      <div
        v-for="group in groupedByOccupancy"
        :key="group.occupancy"
        class="space-y-3"
      >
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-users" class="w-4 h-4 text-gray-400" />
          <span class="font-semibold text-gray-900 dark:text-white">
            {{ group.occupancy }} {{ group.occupancy === 1 ? 'persona' : 'personas' }}
          </span>
          <UBadge variant="subtle">
            {{ group.totalRooms }} hab
          </UBadge>
        </div>

        <div class="space-y-2">
          <HotelRoomTypeCard
            v-for="rt in group.types"
            :key="rt.id"
            :room-type="rt"
            @edit="openEditForm(rt)"
            @delete="handleDelete(rt)"
          />
        </div>
      </div>
    </div>

    <!-- Modal de formulario -->
    <UModal
      v-model:open="isFormModalOpen"
      :title="isEditing ? 'Editar habitación' : 'Nueva habitación'"
      :description="isEditing ? 'Modifica los detalles de la habitación' : 'Ingresa los detalles de la habitación'"
      class="sm:max-w-xl"
    >
      <template #body>
        <HotelRoomTypeForm
          :room-type="editingRoomType"
          :existing-types="roomTypes"
          :max-rooms="totalRoomsInput"
          :used-rooms="usedRooms"
          @submit="handleFormSubmit"
          @cancel="closeFormModal"
        />
      </template>
    </UModal>
  </div>
</template>
