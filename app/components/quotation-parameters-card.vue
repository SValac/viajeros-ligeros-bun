<script setup lang="ts">
import type { Quotation } from '~/types/quotation';

import { sanitizeText } from '~/utils/form-validation';

type Props = {
  quotation: Quotation;
};

const { quotation } = defineProps<Props>();

const cotizacionStore = useCotizacionStore();
const toast = useToast();

const editandoParametros = shallowRef(false);

// Reference for the manual total: the physical seats of the quotation's buses. The total can be
// lower (e.g. seats kept for coordinators), so it isn't filled automatically.
const asientosAutobuses = computed(() =>
  cotizacionStore.getBusesByQuotation(quotation.id).reduce((sum, bus) => sum + bus.capacity, 0),
);
const referenciaAutobuses = computed(() => {
  const n = cotizacionStore.getBusesByQuotation(quotation.id).length;
  if (n === 0)
    return 'Aún no hay autobuses en la cotización';
  return `Autobuses: ${asientosAutobuses.value} asientos (${n} unidad${n === 1 ? '' : 'es'})`;
});

const paramsState = reactive({
  totalSeats: quotation.totalSeats,
  minimumSeatTarget: quotation.minimumSeatTarget,
  notes: quotation.notes ?? '',
});

function openEditarParametros() {
  paramsState.totalSeats = quotation.totalSeats;
  paramsState.minimumSeatTarget = quotation.minimumSeatTarget;
  paramsState.notes = quotation.notes ?? '';
  editandoParametros.value = true;
}

function cerrarEditarParametros() {
  editandoParametros.value = false;
}

// Proxy sanitizado: filtra caracteres inválidos mientras el usuario escribe (sin schema Zod para este form de edición rápida)
const paramsNotesInput = useSanitizedModel(() => paramsState.notes ?? '', v => paramsState.notes = v, sanitizeText);

async function guardarParametros() {
  await cotizacionStore.updateQuotation(quotation.id, {
    totalSeats: paramsState.totalSeats,
    minimumSeatTarget: paramsState.minimumSeatTarget,
    notes: paramsState.notes,
  });
  editandoParametros.value = false;
  toast.add({ title: 'Parámetros actualizados', color: 'success' });
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="font-semibold flex items-center gap-2">
          <span class="i-lucide-settings w-5 h-5 text-muted" />
          Parámetros de la Cotización
        </h2>
        <UButton
          v-if="!editandoParametros"
          icon="i-lucide-pencil"
          size="xs"
          variant="ghost"
          color="neutral"
          label="Editar"
          @click="openEditarParametros"
        />
      </div>
    </template>

    <div v-if="!editandoParametros" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <p class="text-xs text-muted mb-1">
          Capacidad total de asientos
        </p>
        <p class="font-medium">
          {{ quotation.totalSeats }}
        </p>
        <p class="text-xs text-muted">
          {{ referenciaAutobuses }}
        </p>
      </div>
      <div>
        <p class="text-xs text-muted mb-1">
          Meta mínima de asientos
        </p>
        <p class="font-medium">
          {{ quotation.minimumSeatTarget }}
        </p>
      </div>
      <div>
        <p class="text-xs text-muted mb-1">
          Notas
        </p>
        <p class="text-sm">
          {{ quotation.notes || '—' }}
        </p>
      </div>
    </div>

    <div v-else class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField
          label="Capacidad total de asientos"
          :help="`Asientos a la venta entre todos los autobuses. ${referenciaAutobuses}.`"
        >
          <UInput
            v-model.number="paramsState.totalSeats"
            type="number"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Meta mínima de asientos">
          <UInput
            v-model.number="paramsState.minimumSeatTarget"
            type="number"
            class="w-full"
          />
        </UFormField>
      </div>
      <UFormField label="Notas">
        <UTextarea
          v-model="paramsNotesInput"
          :rows="3"
          class="w-full"
        />
      </UFormField>
      <div class="flex justify-end gap-3">
        <UButton
          variant="ghost"
          color="neutral"
          label="Cancelar"
          @click="cerrarEditarParametros"
        />
        <UButton
          label="Guardar"
          @click="guardarParametros"
        />
      </div>
    </div>
  </UCard>
</template>
