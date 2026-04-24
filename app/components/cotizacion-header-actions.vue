<script setup lang="ts">
type Props = {
  quotationId: string;
  readonly: boolean;
};

const { quotationId, readonly } = defineProps<Props>();

const emit = defineEmits<{
  cotizacionConfirmada: [];
}>();

const cotizacionStore = useCotizacionStore();
const travelStore = useTravelsStore();
const toast = useToast();

const cotizacion = computed(() =>
  cotizacionStore.cotizaciones.find(c => c.id === quotationId),
);

const puedeConfirmar = computed(() => cotizacionStore.puedeConfirmar(quotationId));

const isConfirmarModalOpen = shallowRef(false);
const isConfirmando = shallowRef(false);

function getEstadoColor(status: string): 'warning' | 'success' {
  return status === 'confirmed' ? 'success' : 'warning';
}

function getEstadoLabel(status: string): string {
  return status === 'confirmed' ? 'Confirmada' : 'Borrador';
}

async function confirmarQuotation() {
  isConfirmando.value = true;
  const result = cotizacionStore.confirmarQuotation(quotationId, travelStore);
  isConfirmando.value = false;
  isConfirmarModalOpen.value = false;

  if (result.success) {
    toast.add({ title: 'Cotización confirmada', color: 'success' });
    emit('cotizacionConfirmada');
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
      <h2 class="text-lg font-semibold">
        Cotización
      </h2>
      <UBadge
        v-if="cotizacion"
        :label="getEstadoLabel(cotizacion.status)"
        :color="getEstadoColor(cotizacion.status)"
        variant="subtle"
      />
    </div>

    <!-- Acciones -->
    <div class="flex items-center gap-2">
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
          @click="confirmarQuotation"
        />
      </div>
    </template>
  </UModal>
</template>
