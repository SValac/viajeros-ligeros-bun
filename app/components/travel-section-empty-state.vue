<script setup lang="ts">
withDefaults(defineProps<{
  icon: string;
  title: string;
  description?: string;
  navigate: () => void;
}>(), {
  description: 'Se gestiona desde la sección de',
});
</script>

<template>
  <div class="p-8 text-center bg-elevated rounded-lg">
    <span class="w-12 h-12 text-muted mx-auto mb-2 block opacity-50" :class="[icon]" />
    <p class="text-muted font-medium mb-1">
      {{ title }}
    </p>
    <p class="text-sm text-muted">
      {{ description }}
      <UButton
        variant="link"
        color="primary"
        size="xs"
        class="px-0"
        label="Cotización"
        @click="navigate"
      />
    </p>
  </div>
</template>
