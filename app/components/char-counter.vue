<script setup lang="ts">
type Props = {
  value?: string | null;
  max: number;
};

const props = defineProps<Props>();

// Counts like the form schemas (trimmed), so once over the limit the user can tell
// how much to cut. Meant for a UFormField's #hint slot.
const length = computed(() => (props.value ?? '').trim().length);
</script>

<template>
  <span :class="length > max ? 'text-error font-medium' : undefined">
    {{ length }}/{{ max }}
  </span>
</template>
