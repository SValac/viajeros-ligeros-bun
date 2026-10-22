<script setup lang="ts">
type Props = {
  label: string;
  icon: string;
  /** Not needed while `loading`. */
  value?: string;
  /** Color only marks a state (profit/loss, pending/settled); plain figures stay neutral. */
  valueClass?: string;
  /** The figure hasn't arrived: a skeleton instead of a value that would read as 0. */
  loading?: boolean;
};

withDefaults(defineProps<Props>(), {
  value: '',
  valueClass: 'text-highlighted',
  loading: false,
});
</script>

<template>
  <UCard class="h-full">
    <div class="space-y-1">
      <p class="text-sm text-muted flex items-center gap-2">
        <UIcon
          :name="icon"
          class="size-4 shrink-0"
          :class="loading || valueClass === 'text-highlighted' ? undefined : valueClass"
        />
        {{ label }}
      </p>
      <USkeleton v-if="loading" class="h-8 w-24" />
      <p
        v-else
        class="text-2xl font-bold tabular-nums"
        :class="valueClass"
      >
        {{ value }}
      </p>
      <div v-if="$slots.default" class="pt-1 text-xs text-muted space-y-1">
        <slot />
      </div>
    </div>
  </UCard>
</template>
