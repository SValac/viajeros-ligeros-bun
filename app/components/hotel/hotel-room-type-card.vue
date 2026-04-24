<script setup lang="ts">
import type { HotelRoomType } from '~/types/hotel-room';

import { formatBedConfiguration } from '~/utils/hotel-room-helpers';

defineProps<{
  roomType: HotelRoomType;
}>();

const emit = defineEmits<{
  edit: [];
  delete: [];
}>();

const dropdownItems = computed(() => [[
  {
    label: 'Editar',
    icon: 'i-lucide-pencil',
    onSelect: () => emit('edit'),
  },
  {
    label: 'Eliminar',
    icon: 'i-lucide-trash-2',
    onSelect: () => emit('delete'),
  },
]]);
</script>

<template>
  <UCard>
    <div class="flex justify-between items-center gap-4">
      <div class="flex items-center gap-3">
        <UIcon name="i-lucide-bed" class="w-8 h-8 text-primary" />
        <div>
          <p class="font-semibold">
            {{ roomType.roomCount }} habitaciones
          </p>
          <p class="text-sm text-gray-500">
            {{ roomType.maxOccupancy }} {{ roomType.maxOccupancy === 1 ? 'persona' : 'personas' }}
          </p>
        </div>
      </div>

      <div class="flex-1">
        <p class="font-medium">
          {{ formatBedConfiguration(roomType.beds) }}
        </p>
        <p class="text-sm text-gray-500">
          ${{ roomType.pricePerNight.toFixed(2) }}/noche
        </p>
        <p v-if="roomType.additionalDetails" class="text-xs text-gray-400 mt-1">
          {{ roomType.additionalDetails }}
        </p>
      </div>

      <UDropdownMenu :items="dropdownItems">
        <UButton
          icon="i-lucide-more-vertical"
          variant="ghost"
          color="neutral"
        />
      </UDropdownMenu>
    </div>
  </UCard>
</template>
