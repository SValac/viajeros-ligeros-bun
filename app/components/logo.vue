<script setup lang="ts">
type Props = {
  src?: string | null;
  alt?: string;
};

const { src = null, alt = 'Logo' } = defineProps<Props>();
</script>

<template>
  <div>
    <img
      :src="src ?? '/logo.png'"
      :alt="alt"
      class="size-10 object-contain"
    >
  </div>
</template>

<style scoped>

</style>
