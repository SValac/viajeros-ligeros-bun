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

// The total seats are the sum of the quotation's bus capacities (a DB trigger keeps them),
// so they're shown read-only with where they come from.
const origenCapacidad = computed(() => {
  const n = cotizacionStore.getBusesByQuotation(quotation.id).length;
  if (n === 0)
    return 'Agrega autobuses a la cotización para calcularla';
  return `Suma de ${n} autobús${n === 1 ? '' : 'es'}`;
});

const paramsState = reactive({
  minimumSeatTarget: quotation.minimumSeatTarget,
  notes: quotation.notes ?? '',
});

function openEditarParametros() {
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
          {{ origenCapacidad }}
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
          help="Se calcula sola con los autobuses de la cotización."
        >
          <p class="py-1.5 font-medium">
            {{ quotation.totalSeats }} · {{ origenCapacidad }}
          </p>
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
