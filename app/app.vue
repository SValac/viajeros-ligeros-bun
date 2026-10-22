<script setup lang="ts">
import { es } from '@nuxt/ui/locale';

// Spanish texts, but Mexican formats: with `es` an amount shows as "4500,00 MXN"
// and with `es-MX` as "$4,500.00". It also makes Sunday the first day of the calendar.
const locale = extendLocale(es, { code: 'es-MX' });
</script>

<template>
  <UApp :locale="locale">
    <!-- Bar at the top while a navigation waits (first visit to a page loads its JS); hidden under 200 ms -->
    <NuxtLoadingIndicator color="var(--ui-primary)" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
