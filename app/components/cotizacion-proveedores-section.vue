<script setup lang="ts">
type Props = {
  quotationId: string;
  readonly?: boolean;
};

defineProps<Props>();
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="font-semibold flex items-center gap-2">
        <UIcon name="i-lucide-building" class="w-5 h-5 text-muted" />
        Proveedores
      </h2>
    </template>
    <CotizacionProveedorTabla
      :quotation-id="quotationId"
      :readonly="readonly ?? false"
    />
  </UCard>
</template>
