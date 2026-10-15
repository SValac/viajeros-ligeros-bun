<script setup lang="ts">
import type { PaymentStatus } from '~/types/payment';
import type { PaymentParty } from '~/utils/payment-status';

import { getPaymentStatusColor, getPaymentStatusLabel } from '~/utils/payment-status';

/** Payment status of a traveler ("Abono parcial") or a quotation supplier ("Anticipo"). */
defineProps<{
  status: PaymentStatus;
  party: PaymentParty;
}>();
</script>

<template>
  <UBadge
    :label="getPaymentStatusLabel(status, party)"
    :color="getPaymentStatusColor(status)"
    variant="subtle"
  />
</template>
