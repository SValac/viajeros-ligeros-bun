<script setup lang="ts">
type Props = {
  title: string;
  /** One line on what the section answers. */
  description: string;
};

defineProps<Props>();
</script>

<template>
  <section class="space-y-3">
    <div>
      <h2 class="text-base font-semibold text-highlighted">
        {{ title }}
      </h2>
      <p class="text-sm text-muted">
        {{ description }}
      </p>
    </div>
    <slot />
  </section>
</template>
