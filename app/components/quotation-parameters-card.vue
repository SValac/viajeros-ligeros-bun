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

const paramsState = reactive({
  busCapacity: quotation.busCapacity,
  minimumSeatTarget: quotation.minimumSeatTarget,
  notes: quotation.notes ?? '',
});

function openEditarParametros() {
  paramsState.busCapacity = quotation.busCapacity;
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
    busCapacity: paramsState.busCapacity,
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
          Capacidad del Autobús
        </p>
        <p class="font-medium">
          {{ quotation.busCapacity }}
        </p>
      </div>
      <div>
        <p class="text-xs text-muted mb-1">
          Asiento Mínimo Objetivo
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
        <UFormField label="Capacidad del Autobús">
          <UInput
            v-model.number="paramsState.busCapacity"
            type="number"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Asiento Mínimo Objetivo">
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
