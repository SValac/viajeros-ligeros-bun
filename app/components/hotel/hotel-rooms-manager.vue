<script setup lang="ts">
import type { HotelRoomType, HotelRoomTypeFormData, RoomTypesByOccupancy } from '~/types/hotel-room';
import type { Provider } from '~/types/provider';

import HotelRoomTypeCard from '~/components/hotel/hotel-room-type-card.vue';
import HotelRoomTypeForm from '~/components/hotel/hotel-room-type-form.vue';
import { useFormModal } from '~/composables/use-form-modal';
import { useHotelRoomStore } from '~/stores/use-hotel-room-store';
import { toErrorMessage } from '~/utils/error-message';
import { pluralize } from '~/utils/pluralize';

const props = defineProps<{
  provider: Provider;
}>();

defineEmits<{
  close: [];
}>();

const store = useHotelRoomStore();
const toast = useToast();
const confirmDelete = useConfirmDelete();

const totalRoomsInput = ref(0);
const { isOpen: isFormModalOpen, editing: editingRoomType, openNew: openCreateForm, openEdit: openEditForm, close: closeFormModal } = useFormModal<HotelRoomType>();

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

// Creates the provider's room data if it has none. The store checks the catalog as the server
// has it first, so a provider whose data hasn't loaded yet doesn't get a second record.
onMounted(async () => {
  try {
    await store.initRoomData(props.provider.id, 0);
  }
  catch (e) {
    toast.add({ title: 'Error', description: toErrorMessage(e, 'No se pudieron preparar las habitaciones del hotel'), color: 'error' });
  }
});

// Follows the saved total: it arrives with the catalog, after mount.
watch(
  () => store.getTotalRoomsByProvider(props.provider.id),
  (total) => {
    totalRoomsInput.value = total;
  },
  { immediate: true },
);

async function updateTotalRooms() {
  try {
    await store.updateTotalRooms(props.provider.id, totalRoomsInput.value);
  }
  catch (e) {
    toast.add({ title: 'Error', description: toErrorMessage(e, 'No se pudo actualizar el total'), color: 'error' });
    totalRoomsInput.value = store.getTotalRoomsByProvider(props.provider.id);
  }
}

// The modal stays open until the save succeeds, so a failed save keeps what the user typed.
async function handleFormSubmit(data: HotelRoomTypeFormData) {
  const roomTypeId = editingRoomType.value?.id;

  try {
    if (roomTypeId) {
      await store.updateRoomType(roomTypeId, data);
      toast.add({ title: 'Habitación actualizada', color: 'primary' });
    }
    else {
      await store.addRoomType(props.provider.id, data);
      toast.add({ title: 'Habitación agregada', color: 'primary' });
    }
    closeFormModal();
  }
  catch (e) {
    toast.add({ title: 'Error', description: toErrorMessage(e, roomTypeId ? 'No se pudo actualizar la habitación' : 'No se pudo agregar la habitación'), color: 'error' });
  }
}

async function handleDelete(rt: HotelRoomType) {
  if (!(await confirmDelete({
    title: 'Eliminar habitación',
    description: '¿Estás seguro de eliminar este tipo de habitación?',
  }))) {
    return;
  }

  try {
    await store.deleteRoomType(rt.id);
    toast.add({ title: 'Habitación eliminada', color: 'warning' });
  }
  catch (e) {
    toast.add({ title: 'Error', description: toErrorMessage(e, 'No se pudo eliminar la habitación'), color: 'error' });
  }
}
</script>

<template>
  <UCard>
    <LoadState
      :is-loaded="store.isLoaded"
      :load-error="store.loadError"
      label="las habitaciones"
      @retry="store.refetch()"
    >
      <div class="space-y-6">
        <!-- Header -->
        <div class="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">
              Habitaciones
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
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
              Disponibles: {{ totalRoomsInput - usedRooms }}
            </label>
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
        <EmptyState
          v-if="roomTypes.length === 0"
          section="roomTypes"
          :actions="[{ label: 'Agregar tipo de habitación', icon: 'i-lucide-plus', onClick: openCreateForm }]"
        />

        <!-- Groups by occupancy -->
        <div v-else class="space-y-6">
          <div
            v-for="group in groupedByOccupancy"
            :key="group.occupancy"
            class="space-y-3"
          >
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-users" class="w-4 h-4 text-gray-400" />
              <span class="font-semibold text-gray-900 dark:text-white">
                {{ pluralize(group.occupancy, 'persona') }}
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
      </div>
    </LoadState>

    <!-- Form modal -->
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
  </UCard>
</template>
