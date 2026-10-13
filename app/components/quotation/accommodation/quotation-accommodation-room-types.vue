<script setup lang="ts">
import type { HotelRoomType } from '~/types/hotel-room';
import type { QuotationAccommodationDetailFormData } from '~/types/quotation';

import { formatCurrency } from '~/utils/currency';
import { formatBedConfiguration } from '~/utils/hotel-room-helpers';

type Props = {
  roomTypes: HotelRoomType[];
  nightCount: number;
  /** Rooms the travel already holds per room type id; only known when editing. */
  roomCounts?: Map<string, number>;
};

const props = defineProps<Props>();

// Picking the hotel's room types is all the quotation needs (public prices come from
// them). How many rooms of each the travel takes is set on the travel's rooms page.
const details = defineModel<QuotationAccommodationDetailFormData[]>({ required: true });

const selectedIds = computed(() => new Set(details.value.map(d => d.roomTypeId)));

function toggle(tipo: HotelRoomType) {
  if (selectedIds.value.has(tipo.id)) {
    details.value = details.value.filter(d => d.roomTypeId !== tipo.id);
    return;
  }
  details.value = [
    ...details.value,
    { roomTypeId: tipo.id, pricePerNight: tipo.pricePerNight, maxOccupancy: tipo.maxOccupancy },
  ];
}

function roomCount(tipoId: string): number {
  return props.roomCounts?.get(tipoId) ?? 0;
}

// Types unchecked here that still have rooms on the travel: saving deletes those rooms.
const droppedWithRooms = computed(() =>
  props.roomTypes.filter(t => !selectedIds.value.has(t.id) && roomCount(t.id) > 0),
);
</script>

<template>
  <div class="space-y-3">
    <h3 class="font-semibold flex items-center gap-2">
      <UIcon name="i-lucide-door-open" class="size-4" />
      Tipos de Habitación
    </h3>

    <div v-if="roomTypes.length === 0" class="text-center py-6 text-muted text-sm">
      Este hotel no tiene tipos de habitación configurados
    </div>

    <div v-else class="space-y-3 max-h-80 overflow-y-auto border border-default rounded-lg p-4">
      <label
        v-for="tipo in roomTypes"
        :key="tipo.id"
        class="flex items-start gap-3 border border-default rounded-lg p-4 cursor-pointer"
        :class="selectedIds.has(tipo.id) ? 'border-primary bg-primary/5' : ''"
      >
        <UCheckbox
          :model-value="selectedIds.has(tipo.id)"
          @update:model-value="() => toggle(tipo)"
        />
        <div class="flex-1 min-w-0 space-y-0.5">
          <div class="flex flex-wrap items-center gap-2">
            <p class="font-medium">
              {{ tipo.maxOccupancy }} persona{{ tipo.maxOccupancy === 1 ? '' : 's' }} · {{ formatCurrency(tipo.pricePerNight) }}/noche
            </p>
            <UBadge
              v-if="roomCounts"
              :label="`${roomCount(tipo.id)} hab. en el viaje`"
              :color="roomCount(tipo.id) > 0 ? 'primary' : 'neutral'"
              variant="subtle"
              size="sm"
            />
          </div>
          <p class="text-xs text-muted">
            Cama(s): {{ formatBedConfiguration(tipo.beds) }}
          </p>
          <p v-if="tipo.additionalDetails" class="text-xs text-muted">
            {{ tipo.additionalDetails }}
          </p>
          <p v-if="selectedIds.has(tipo.id)" class="text-xs text-toned pt-1">
            {{ formatCurrency(tipo.pricePerNight / tipo.maxOccupancy) }} por persona/noche ·
            {{ formatCurrency(tipo.pricePerNight * nightCount) }} por habitación ({{ nightCount }} noche{{ nightCount === 1 ? '' : 's' }})
          </p>
        </div>
      </label>
    </div>

    <UAlert
      v-if="droppedWithRooms.length > 0"
      icon="i-lucide-triangle-alert"
      color="warning"
      variant="subtle"
      title="Quitaste tipos con habitaciones en el viaje"
      description="Al guardar se borran del viaje sus habitaciones vacías. Si alguna tiene viajeros no se podrá guardar: sácalos primero en la pestaña Habitaciones."
    />
    <UAlert
      v-else
      icon="i-lucide-info"
      color="neutral"
      variant="subtle"
      description="Cuántas habitaciones de cada tipo se apartan se define en la pestaña Habitaciones del viaje. El costo del hotel se calcula con esas habitaciones."
    />
  </div>
</template>
