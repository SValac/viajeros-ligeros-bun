<script setup lang="ts">
import type { Traveler } from '~/types/traveler';

type CoordinatorRow = {
  coordinator: Traveler;
  /** "Bus — asiento N", or undefined without a seat. */
  seatLabel?: string;
  roomLabels: string[];
};

type Props = {
  rows: CoordinatorRow[];
  /** From the quotation: whether coordinators take passenger seats. */
  takesSeats: boolean;
};

const { rows, takesSeats } = defineProps<Props>();
const emit = defineEmits<{
  assignSeat: [coordinator: Traveler];
  changeSeat: [coordinator: Traveler];
  clearSeat: [coordinator: Traveler];
}>();

function getActions(row: CoordinatorRow) {
  if (!row.seatLabel)
    return [];
  return [[
    { label: 'Cambiar asiento', icon: 'i-lucide-arrow-left-right', onSelect: () => emit('changeSeat', row.coordinator) },
    { label: 'Quitar asiento', icon: 'i-lucide-x', color: 'error' as const, onSelect: () => emit('clearSeat', row.coordinator) },
  ]];
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <h2 class="font-semibold flex items-center gap-2">
          <UIcon name="i-lucide-user-cog" class="size-5 text-info" />
          Coordinadores
        </h2>
        <UBadge
          :label="takesSeats ? 'Ocupan asiento' : 'Sin asiento de pasajero'"
          :color="takesSeats ? 'info' : 'neutral'"
          variant="subtle"
        />
      </div>
    </template>

    <p v-if="rows.length === 0" class="text-sm text-muted">
      Este viaje no tiene coordinadores.
    </p>

    <ul v-else class="divide-y divide-default">
      <li
        v-for="row in rows"
        :key="row.coordinator.id"
        class="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0"
      >
        <div class="min-w-0">
          <p class="text-sm font-medium truncate">
            {{ row.coordinator.firstName }}
          </p>
          <p class="text-xs text-muted">
            <template v-if="row.seatLabel">
              {{ row.seatLabel }}
            </template>
            <template v-else-if="takesSeats">
              Sin asiento asignado
            </template>
            <template v-else>
              Viaja sin asiento de pasajero
            </template>
            · {{ row.roomLabels.length > 0 ? row.roomLabels.join(', ') : 'Sin habitación' }}
          </p>
        </div>

        <UButton
          v-if="takesSeats && !row.seatLabel"
          icon="i-lucide-armchair"
          label="Asignar asiento"
          size="xs"
          variant="soft"
          @click="emit('assignSeat', row.coordinator)"
        />
        <UDropdownMenu v-else-if="row.seatLabel" :items="getActions(row)">
          <UButton
            icon="i-lucide-more-vertical"
            color="neutral"
            variant="ghost"
            size="xs"
          />
        </UDropdownMenu>
      </li>
    </ul>

    <p v-if="!takesSeats && rows.length > 0" class="text-xs text-dimmed mt-3">
      La cotización no cuenta a los coordinadores como pasajeros. Actívalo en sus parámetros para restarlos de los asientos vendibles y asignarles asiento.
    </p>
  </UCard>
</template>
