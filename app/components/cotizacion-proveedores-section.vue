<script setup lang="ts">
type Props = {
  cotizacionId: string;
  readonly?: boolean;
};

defineProps<Props>();
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="font-semibold flex items-center gap-2">
        <span class="i-lucide-building w-5 h-5 text-muted" />
        Servicios
      </h2>
    </template>
    <CotizacionProveedorTabla
      :cotizacion-id="cotizacionId"
      :readonly="readonly ?? false"
    />
  </UCard>
</template>
