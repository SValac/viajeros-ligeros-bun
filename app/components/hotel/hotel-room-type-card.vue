<script setup lang="ts">
import type { HotelRoomType } from '~/types/hotel-room';

import { deleteAction } from '~/utils/actions-column';
import { formatCurrency } from '~/utils/currency';
import { formatBedConfiguration } from '~/utils/hotel-room-helpers';
import { pluralize } from '~/utils/pluralize';

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
  deleteAction(() => emit('delete')),
]]);
</script>

<template>
  <UCard>
    <div class="flex justify-between items-center gap-4">
      <div class="flex items-center gap-3">
        <UIcon name="i-lucide-bed" class="w-8 h-8 text-primary" />
        <div>
          <p class="font-semibold">
            {{ pluralize(roomType.roomCount, 'habitación', 'habitaciones') }}
          </p>
          <p class="text-sm text-gray-500">
            {{ pluralize(roomType.maxOccupancy, 'persona') }}
          </p>
        </div>
      </div>

      <div class="flex-1">
        <p class="font-medium">
          {{ formatBedConfiguration(roomType.beds) }}
        </p>
        <p class="text-sm text-gray-500">
          {{ formatCurrency(roomType.pricePerNight) }}/noche
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
