<script setup lang="ts">
import type { TravelStatus } from '~/types/travel';

import { getTravelStatusColor, getTravelStatusLabel } from '~/utils/travel-status';

/** A travel's status. `size` and `class` fall through to the `UBadge`. */
defineProps<{
  status: TravelStatus;
}>();
</script>

<template>
  <UBadge
    :label="getTravelStatusLabel(status)"
    :color="getTravelStatusColor(status)"
    variant="subtle"
  />
</template>
