<script setup lang="ts">
type Props = {
  cotizacionId: string;
  readonly: boolean;
};

const { cotizacionId, readonly } = defineProps<Props>();

const emit = defineEmits<{
  'cotizacion-confirmada': [];
}>();

const cotizacionStore = useCotizacionStore();
const travelStore = useTravelsStore();
const toast = useToast();

const cotizacion = computed(() =>
  cotizacionStore.cotizaciones.find(c => c.id === cotizacionId),
);

const puedeConfirmar = computed(() => cotizacionStore.puedeConfirmar(cotizacionId));
const asientoMinimoCalculado = computed(() => cotizacionStore.getAsientoMinimoCalculado(cotizacionId));

const isConfirmarModalOpen = shallowRef(false);
const isConfirmando = shallowRef(false);

function getEstadoColor(estado: string): 'warning' | 'success' {
  return estado === 'confirmada' ? 'success' : 'warning';
}

function getEstadoLabel(estado: string): string {
  return estado === 'confirmada' ? 'Confirmada' : 'Borrador';
}

function calcularAsientoMinimo() {
  if (readonly) return;
  cotizacionStore.updateCotizacion(cotizacionId, {
    asientoMinimoObjetivo: asientoMinimoCalculado.value,
  });
  toast.add({
    title: 'Asiento mínimo actualizado',
    description: `Asiento mínimo calculado: ${asientoMinimoCalculado.value}`,
    color: 'success',
  });
}

async function confirmarCotizacion() {
  isConfirmando.value = true;
  const result = cotizacionStore.confirmarCotizacion(cotizacionId, travelStore);
  isConfirmando.value = false;
  isConfirmarModalOpen.value = false;

  if (result.success) {
    toast.add({ title: 'Cotización confirmada', color: 'success' });
    emit('cotizacion-confirmada');
  }
  else {
    toast.add({ title: 'Error al confirmar', description: result.error, color: 'error' });
  }
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <!-- Estado badge -->
    <div class="flex items-center gap-2">
      <h2 class="text-lg font-semibold">Cotización</h2>
      <UBadge
        v-if="cotizacion"
        :label="getEstadoLabel(cotizacion.estado)"
        :color="getEstadoColor(cotizacion.estado)"
        variant="subtle"
      />
    </div>

    <!-- Acciones -->
    <div class="flex items-center gap-2">
      <!-- Calcular asiento mínimo -->
      <UButton
        icon="i-lucide-calculator"
        label="Calcular asiento mínimo"
        variant="outline"
        color="neutral"
        size="sm"
        :disabled="readonly"
        @click="calcularAsientoMinimo"
      />

      <!-- Confirmar cotización -->
      <UTooltip
        :text="!puedeConfirmar ? 'Todos los proveedores deben estar confirmados' : ''"
        :disabled="puedeConfirmar && !readonly"
      >
        <UButton
          icon="i-lucide-check-circle"
          label="Confirmar cotización"
          color="success"
          size="sm"
          :disabled="readonly || !puedeConfirmar"
          @click="isConfirmarModalOpen = true"
        />
      </UTooltip>
    </div>
  </div>

  <!-- Modal: confirmación -->
  <UModal
    v-model:open="isConfirmarModalOpen"
    title="Confirmar Cotización"
    description="Al confirmar, se generarán los servicios del viaje a partir de los proveedores registrados. Esta acción no se puede deshacer."
  >
    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton
          variant="ghost"
          color="neutral"
          label="Cancelar"
          @click="isConfirmarModalOpen = false"
        />
        <UButton
          color="success"
          label="Confirmar"
          :loading="isConfirmando"
          @click="confirmarCotizacion"
        />
      </div>
    </template>
  </UModal>
</template>
