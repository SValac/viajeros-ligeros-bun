<script setup lang="ts">
/**
 * Spinner, then error + Reintentar, then the slot: for screens that read a catalog store
 * (providers, coordinators, buses, hotel rooms). Until the catalog loads, an empty list or a
 * missing record would be a lie. A failed refetch with data already loaded keeps the slot.
 */
const props = defineProps<{
  isLoaded: boolean;
  loadError: unknown;
  /** What failed to load, e.g. "los proveedores". */
  label: string;
}>();

defineEmits<{
  retry: [];
}>();

const hasError = computed(() => !props.isLoaded && !!props.loadError);
</script>

<template>
  <slot v-if="isLoaded" />
  <div v-else-if="hasError" class="flex flex-col items-center justify-center gap-4 py-12">
    <p class="text-muted">
      No se pudieron cargar {{ label }}
    </p>
    <UButton
      label="Reintentar"
      icon="i-lucide-refresh-cw"
      @click="$emit('retry')"
    />
  </div>
  <div v-else class="flex justify-center py-12">
    <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-muted" />
  </div>
</template>
