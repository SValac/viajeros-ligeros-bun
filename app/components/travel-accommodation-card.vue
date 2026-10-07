<script setup lang="ts">
import type { TravelAccommodation } from '~/types/travel';
import type { Traveler } from '~/types/traveler';

type Props = {
  accommodation: TravelAccommodation;
  occupants: Traveler[];
  providerName?: string;
  /** Room type's own description (e.g. "Suite junior con jacuzzi"), what tells same-size rooms apart. */
  roomTypeDetails?: string;
  /** Room type's beds, already formatted (e.g. "1 cama king"). */
  roomTypeBeds?: string;
  /** Companion id → their representative's full name, to show which group each occupant belongs to. */
  representativeNames?: Record<string, string>;
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

function toggleEditing() {
  isEditing.value = !isEditing.value;
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
            variant="subtle"
            color="neutral"
          />
        </div>
        <div class="flex items-center gap-2">
          <UBadge
            :label="`${occupants.length}/${accommodation.maxOccupancy}`"
            :color="isFull ? 'warning' : 'success'"
            variant="subtle"
          />
          <UButton
            icon="i-lucide-pencil"
            size="xs"
            variant="ghost"
            color="neutral"
            @click="toggleEditing"
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
      <div v-if="roomTypeDetails || roomTypeBeds">
        <p v-if="roomTypeDetails" class="text-sm font-medium">
          {{ roomTypeDetails }}
        </p>
        <p v-if="roomTypeBeds" class="text-xs text-muted">
          {{ roomTypeBeds }}
        </p>
      </div>

      <!-- Occupants list -->
      <div class="space-y-1">
        <div
          v-for="traveler in occupants"
          :key="traveler.id"
          class="flex items-center justify-between gap-2 rounded-md border border-default px-2 py-1.5"
        >
          <div class="flex items-center gap-2 min-w-0">
            <UIcon
              v-if="traveler.kind === 'coordinator'"
              name="i-lucide-user-cog"
              class="size-3.5 text-info shrink-0"
            />
            <UIcon
              v-else-if="traveler.isRepresentative"
              name="i-lucide-user-star"
              class="size-3.5 text-primary shrink-0"
            />
            <UIcon
              v-else
              name="i-lucide-user"
              class="size-3.5 text-muted shrink-0"
            />
            <div class="min-w-0">
              <p class="text-sm truncate">
                {{ traveler.firstName }} {{ traveler.lastName }}
              </p>
              <p v-if="traveler.kind === 'coordinator'" class="text-xs text-info">
                Coordinador
              </p>
              <p
                v-if="representativeNames?.[traveler.id]"
                class="flex items-center gap-1 text-xs text-muted min-w-0"
              >
                <UIcon name="i-lucide-user-star" class="size-3 text-primary shrink-0" />
                <span class="truncate">{{ representativeNames[traveler.id] }}</span>
              </p>
            </div>
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
