<script setup lang="ts">
/**
 * Spinner, then error + Reintentar, then the slot: for screens that read a query or a catalog
 * store. Until the data loads, an empty list or a missing record would be a lie. A failed
 * refetch with data already loaded keeps the slot, with a warning and Reintentar above it.
 * For a Pinia Colada query, get the props from `useQueryLoadState`.
 */
const props = defineProps<{
  isLoaded: boolean;
  loadError: unknown;
  /** What failed to load, with its article: "los proveedores", "la cotización". */
  label: string;
  /** Center the spinner and the error in the full height (a whole page) instead of padding. */
  fill?: boolean;
}>();

const emit = defineEmits<{
  retry: [];
}>();

const hasError = computed(() => !props.isLoaded && !!props.loadError);
// What is on screen is the last load that worked; a refetch failed after it
const isStale = computed(() => props.isLoaded && !!props.loadError);
// The verb agrees with the label's article: "No se pudieron cargar los…" / "No se pudo cargar la…"
const isPlural = computed(() => /^(?:los|las) /.test(props.label));
const errorMessage = computed(() => isPlural.value
  ? `No se pudieron cargar ${props.label}`
  : `No se pudo cargar ${props.label}`);
const staleMessage = computed(() => isPlural.value
  ? `No se pudieron actualizar ${props.label}`
  : `No se pudo actualizar ${props.label}`);
</script>

<template>
  <template v-if="isLoaded">
    <UAlert
      v-if="isStale"
      :title="staleMessage"
      description="Se muestra lo último que se cargó."
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :actions="[{ label: 'Reintentar', icon: 'i-lucide-refresh-cw', color: 'warning', variant: 'outline', onClick: () => emit('retry') }]"
      class="mb-4"
    />
    <slot />
  </template>
  <div
    v-else-if="hasError"
    class="flex flex-col items-center justify-center gap-4"
    :class="fill ? 'h-full' : 'py-12'"
  >
    <p class="text-muted">
      {{ errorMessage }}
    </p>
    <UButton
      label="Reintentar"
      icon="i-lucide-refresh-cw"
      @click="emit('retry')"
    />
  </div>
  <div
    v-else
    class="flex items-center justify-center"
    :class="fill ? 'h-full' : 'py-12'"
  >
    <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-muted" />
  </div>
</template>
