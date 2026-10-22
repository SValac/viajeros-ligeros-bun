<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';

// Not UPageHeader: that one is for docs pages (bottom border, description under the actions,
// no back arrow or icon).
type Props = {
  title: string;
  description?: string;
  /** Where the back arrow goes; no arrow without it. */
  to?: RouteLocationRaw;
  backLabel?: string;
  /** Large icon before the title (catalog pages). */
  icon?: string;
  iconClass?: string;
};

withDefaults(defineProps<Props>(), {
  backLabel: 'Volver',
  iconClass: 'text-primary',
});
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div class="flex items-center gap-3 min-w-0">
      <UButton
        v-if="to"
        icon="i-lucide-arrow-left"
        variant="ghost"
        color="neutral"
        :aria-label="backLabel"
        :to="to"
      />
      <UIcon
        v-if="icon"
        :name="icon"
        class="size-10 shrink-0"
        :class="iconClass"
      />
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="text-2xl sm:text-3xl font-bold text-highlighted wrap-break-word">
            {{ title }}
          </h1>
          <slot name="badge" />
        </div>
        <div v-if="description || $slots.description" class="mt-1 text-muted">
          <slot name="description">
            {{ description }}
          </slot>
        </div>
      </div>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
