<script setup lang="ts">
import { es } from '@nuxt/ui/locale';

// Textos en español, pero formatos de México: con `es` el monto sale como "4500,00 MXN"
// y con `es-MX` como "$4,500.00". También deja el domingo como primer día del calendario.
const locale = extendLocale(es, { code: 'es-MX' });
</script>

<template>
  <UApp :locale="locale">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
