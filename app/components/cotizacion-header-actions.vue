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
const isReabrirModalOpen = shallowRef(false);
const isReabriendo = shallowRef(false);

function openConfirmarModal() {
  isConfirmarModalOpen.value = true;
}

function closeConfirmarModal() {
  isConfirmarModalOpen.value = false;
}

function getEstadoColor(status: string): 'warning' | 'success' {
  return status === 'confirmed' ? 'success' : 'warning';
}

function getEstadoLabel(status: string): string {
  return status === 'confirmed' ? 'Confirmada' : 'Borrador';
}

function openReabrirModal() {
  isReabrirModalOpen.value = true;
}

function closeReabrirModal() {
  isReabrirModalOpen.value = false;
}

async function reabrirQuotation() {
  isReabriendo.value = true;
  const result = await cotizacionStore.reabrirQuotation(quotationId);
  isReabriendo.value = false;
  isReabrirModalOpen.value = false;

  if (result.success)
    toast.add({ title: 'Cotización reabierta', description: 'Vuelve a estar en borrador', color: 'success' });
  else
    toast.add({ title: 'Error al reabrir', description: result.error, color: 'error' });
}

async function confirmarQuotation() {
  isConfirmando.value = true;
  const result = await cotizacionStore.confirmarQuotation(quotationId, travelStore);
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
      <!-- Reabrir cotización (vuelve a borrador) -->
      <UButton
        v-if="readonly"
        icon="i-lucide-lock-open"
        label="Reabrir cotización"
        color="neutral"
        variant="outline"
        size="sm"
        @click="openReabrirModal"
      />

      <!-- Confirmar cotización -->
      <UTooltip
        v-else
        :text="!puedeConfirmar ? 'Todos los proveedores deben estar confirmados' : ''"
        :disabled="puedeConfirmar && !readonly"
      >
        <UButton
          icon="i-lucide-check-circle"
          label="Confirmar cotización"
          color="success"
          size="sm"
          :disabled="readonly || !puedeConfirmar"
          @click="openConfirmarModal"
        />
      </UTooltip>
    </div>
  </div>

  <!-- Modal: confirmación -->
  <UModal
    v-model:open="isConfirmarModalOpen"
    title="Confirmar Cotización"
    description="Al confirmar, se generarán los servicios del viaje a partir de los proveedores registrados y ya no se podrán editar proveedores, hospedaje ni autobuses. Los pagos a proveedores se siguen registrando normalmente, y puedes reabrirla si necesitas corregir algo."
  >
    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton
          variant="ghost"
          color="neutral"
          label="Cancelar"
          @click="closeConfirmarModal"
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

  <!-- Modal: reabrir -->
  <UModal
    v-model:open="isReabrirModalOpen"
    title="Reabrir Cotización"
    description="La cotización vuelve a borrador para poder editar proveedores, hospedaje y autobuses. Los pagos registrados no cambian, y los servicios del viaje se regeneran al volver a confirmarla."
  >
    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton
          variant="ghost"
          color="neutral"
          label="Cancelar"
          @click="closeReabrirModal"
        />
        <UButton
          icon="i-lucide-lock-open"
          label="Reabrir"
          :loading="isReabriendo"
          @click="reabrirQuotation"
        />
      </div>
    </template>
  </UModal>
</template>
