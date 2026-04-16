<script setup lang="ts">
type Props = {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral' | 'info';
  text: string;
  icon?: string;
};

const { size = 'lg', color = 'primary', text, icon } = defineProps<Props>();
</script>

<template>
  <USeparator
    class="my-6"
    :size="size"
    :color="color"
  >
    <h2 class="text-xl font-semibold flex items-center gap-2">
      <UIcon v-if="icon" :name="icon" />
      {{ text }}
    </h2>
  </USeparator>
</template>

<style scoped>

</style>
