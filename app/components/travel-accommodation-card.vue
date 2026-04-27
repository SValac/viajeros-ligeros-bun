<script setup lang="ts">
import type { TravelAccommodation } from '~/types/travel';
import type { Traveler } from '~/types/traveler';

type Props = {
  accommodation: TravelAccommodation;
  occupants: Traveler[];
  providerName?: string;
  roomTypeName?: string;
};

type Emits = {
  addTraveler: [accommodationId: string];
  removeTraveler: [travelerId: string];
  update: [accommodation: TravelAccommodation, data: { roomNumber?: string | null; floor?: number | null }];
};

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const isEditing = shallowRef(false);
const isFull = computed(() => props.occupants.length >= props.accommodation.maxOccupancy);

const roomLabel = computed(() => {
  if (props.accommodation.roomNumber) {
    return `Hab. ${props.accommodation.roomNumber}`;
  }
  return 'Sin número';
});

const floorLabel = computed(() => {
  if (props.accommodation.floor !== undefined && props.accommodation.floor !== null) {
    return `Piso ${props.accommodation.floor}`;
  }
  return null;
});

function onSubmit(data: { roomNumber?: string | null; floor?: number | null }): void {
  emit('update', props.accommodation, data);
  isEditing.value = false;
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-bed-double" class="size-4 text-muted" />
          <span class="font-semibold text-sm">{{ roomLabel }}</span>
          <UBadge
            v-if="floorLabel"
            :label="floorLabel"
            size="xs"
            variant="subtle"
            color="neutral"
          />
        </div>
        <div class="flex items-center gap-2">
          <UBadge
            :label="`${occupants.length}/${accommodation.maxOccupancy}`"
            size="xs"
            :color="isFull ? 'warning' : 'success'"
            variant="subtle"
          />
          <UButton
            icon="i-lucide-pencil"
            size="xs"
            variant="ghost"
            color="neutral"
            @click="isEditing = !isEditing"
          />
        </div>
      </div>
    </template>

    <div class="space-y-3">
      <!-- Inline edit form -->
      <div v-if="isEditing">
        <TravelAccommodationForm
          :accommodation="accommodation"
          @submit="onSubmit"
          @cancel="isEditing = false"
        />
      </div>

      <!-- Room type info -->
      <p v-if="roomTypeName" class="text-xs text-muted">
        {{ roomTypeName }}
      </p>

      <!-- Occupants list -->
      <div class="space-y-1">
        <div
          v-for="traveler in occupants"
          :key="traveler.id"
          class="flex items-center justify-between gap-2 rounded-md border border-default px-2 py-1.5"
        >
          <div class="flex items-center gap-2 min-w-0">
            <UIcon
              v-if="traveler.isRepresentative"
              name="i-lucide-user-star"
              class="size-3.5 text-primary shrink-0"
            />
            <UIcon
              v-else
              name="i-lucide-user"
              class="size-3.5 text-muted shrink-0"
            />
            <span class="text-sm truncate">{{ traveler.firstName }} {{ traveler.lastName }}</span>
          </div>
          <UButton
            icon="i-lucide-x"
            size="xs"
            variant="ghost"
            color="error"
            @click="emit('removeTraveler', traveler.id)"
          />
        </div>

        <div
          v-if="occupants.length === 0"
          class="text-xs text-muted text-center py-2"
        >
          Sin viajeros asignados
        </div>
      </div>

      <!-- Add traveler button -->
      <UButton
        v-if="!isFull"
        icon="i-lucide-plus"
        label="Agregar viajero"
        size="xs"
        variant="outline"
        color="neutral"
        block
        @click="emit('addTraveler', accommodation.id)"
      />
      <p v-else class="text-xs text-muted text-center">
        Habitación llena
      </p>
    </div>
  </UCard>
</template>
