<script setup lang="ts">
type Props = {
  cotizacionId: string;
  readonly?: boolean;
};

type Emits = {
  (e: 'agregarHospedaje'): void;
};

defineProps<Props>();
defineEmits<Emits>();
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between w-full">
        <h2 class="font-semibold flex items-center gap-2">
          <span class="i-lucide-door-open w-5 h-5 text-muted" />
          Hospedaje
        </h2>
        <UButton
          v-if="!readonly"
          icon="i-lucide-plus"
          size="xs"
          label="Agregar Hospedaje"
          @click="$emit('agregarHospedaje')"
        />
      </div>
    </template>
    <div class="space-y-6">
      <!-- Tabla de hospedajes -->
      <CotizacionHospedajeTabla
        :cotizacion-id="cotizacionId"
        :readonly="readonly ?? false"
      />

      <!-- Resumen de hospedajes -->
      <CotizacionHospedajeResumen
        :cotizacion-id="cotizacionId"
      />
    </div>
  </UCard>
</template>
