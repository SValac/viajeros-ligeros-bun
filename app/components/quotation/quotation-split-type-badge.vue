<script setup lang="ts">
import type { CostSplitType } from '~/types/quotation';

import { getCostSplitShortLabel } from '~/utils/quotation-labels';

/** How a quotation cost is split among the seats, in the "División" column of its table. */
defineProps<{
  splitType: CostSplitType;
}>();
</script>

<template>
  <UBadge
    :label="getCostSplitShortLabel(splitType)"
    :color="splitType === 'minimum' ? 'info' : 'neutral'"
    variant="subtle"
  />
</template>
