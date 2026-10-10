<script setup lang="ts">
type Props = {
  label: string;
  icon: string;
  value: string;
  /** Color only marks a state (profit/loss, pending/settled); plain figures stay neutral. */
  valueClass?: string;
};

withDefaults(defineProps<Props>(), {
  valueClass: 'text-highlighted',
});
</script>

<template>
  <UCard class="h-full">
    <div class="space-y-1">
      <p class="text-sm text-muted flex items-center gap-2">
        <UIcon
          :name="icon"
          class="size-4 shrink-0"
          :class="valueClass === 'text-highlighted' ? undefined : valueClass"
        />
        {{ label }}
      </p>
      <p class="text-2xl font-bold tabular-nums" :class="valueClass">
        {{ value }}
      </p>
      <div v-if="$slots.default" class="pt-1 text-xs text-muted space-y-1">
        <slot />
      </div>
    </div>
  </UCard>
</template>
