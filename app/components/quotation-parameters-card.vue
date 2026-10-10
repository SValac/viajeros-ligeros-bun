<script setup lang="ts">
import type { Quotation } from '~/types/quotation';

import { travelDetailQuery } from '~/queries/travels';
import { sanitizeText } from '~/utils/form-validation';

type Props = {
  quotation: Quotation;
  /** Confirmed quotations show their parameters without the edit button. */
  readonly?: boolean;
};

const { quotation, readonly = false } = defineProps<Props>();

const cotizacionStore = useCotizacionStore();
const travelerStore = useTravelerStore();
const toast = useToast();

const editandoParametros = shallowRef(false);
const confirmarQuitarAsientos = shallowRef(false);
const guardando = shallowRef(false);

const { data: travel } = useQuery(() => travelDetailQuery(quotation.travelId));

const numCoordinadores = computed(() =>
  travel.value?.coordinatorIds.length ?? 0,
);
const asientosVendibles = computed(() => cotizacionStore.getAsientosVendibles(quotation.id));
const origenVendibles = computed(() => {
  if (!quotation.coordinatorsTakeSeats || numCoordinadores.value === 0)
    return 'Todos los asientos se venden';
  const n = numCoordinadores.value;
  return `${quotation.totalSeats} − ${n} coordinador${n === 1 ? '' : 'es'}`;
});

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
  coordinatorsTakeSeats: quotation.coordinatorsTakeSeats,
  notes: quotation.notes ?? '',
});

function openEditarParametros() {
  paramsState.minimumSeatTarget = quotation.minimumSeatTarget;
  paramsState.coordinatorsTakeSeats = quotation.coordinatorsTakeSeats;
  paramsState.notes = quotation.notes ?? '';
  editandoParametros.value = true;
}

function cerrarEditarParametros() {
  editandoParametros.value = false;
}

// Proxy sanitizado: filtra caracteres inválidos mientras el usuario escribe (sin schema Zod para este form de edición rápida)
const paramsNotesInput = useSanitizedModel(() => paramsState.notes ?? '', v => paramsState.notes = v, sanitizeText);

function cancelarQuitarAsientos() {
  confirmarQuitarAsientos.value = false;
}

// When coordinators stop taking passenger seats, the ones already seated lose their seat
// (their rooms stay). Asks first if anyone would be affected.
async function guardarParametros() {
  const quitaAsientos = quotation.coordinatorsTakeSeats && !paramsState.coordinatorsTakeSeats;
  if (quitaAsientos && !confirmarQuitarAsientos.value) {
    await travelerStore.fetchByTravel(quotation.travelId);
    const sentados = travelerStore.getCoordinatorsByTravel(quotation.travelId).filter(c => c.seat !== null);
    if (sentados.length > 0) {
      confirmarQuitarAsientos.value = true;
      return;
    }
  }
  confirmarQuitarAsientos.value = false;

  guardando.value = true;
  try {
    if (quitaAsientos)
      await travelerStore.clearCoordinatorSeats(quotation.travelId);
    const updated = await cotizacionStore.updateQuotation(quotation.id, {
      minimumSeatTarget: paramsState.minimumSeatTarget,
      coordinatorsTakeSeats: paramsState.coordinatorsTakeSeats,
      notes: paramsState.notes,
    });
    if (!updated)
      throw new Error(cotizacionStore.error ?? 'No se pudieron guardar los parámetros');
    editandoParametros.value = false;
    toast.add({ title: 'Parámetros actualizados', color: 'success' });
  }
  catch (e) {
    toast.add({
      title: 'Error al guardar',
      description: e instanceof Error ? e.message : undefined,
      color: 'error',
    });
  }
  finally {
    guardando.value = false;
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="font-semibold flex items-center gap-2">
          <UIcon name="i-lucide-settings" class="w-5 h-5 text-muted" />
          Parámetros de la Cotización
        </h2>
        <UButton
          v-if="!readonly && !editandoParametros"
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
          Asientos vendibles
        </p>
        <p class="font-medium">
          {{ asientosVendibles }}
        </p>
        <p class="text-xs text-muted">
          {{ origenVendibles }}
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
          Coordinadores
        </p>
        <p class="text-sm">
          {{ quotation.coordinatorsTakeSeats ? 'Ocupan asiento' : 'No ocupan asiento' }}
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

    <div v-else-if="!readonly" class="space-y-4">
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
      <USwitch
        v-model="paramsState.coordinatorsTakeSeats"
        label="Los coordinadores ocupan asiento"
        :description="`Resta ${numCoordinadores} coordinador${numCoordinadores === 1 ? '' : 'es'} de los asientos vendibles y permite asignarles asiento. Si no, viajan sin asiento de pasajero (solo habitación).`"
      />
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
          :loading="guardando"
          @click="guardarParametros"
        />
      </div>
    </div>

    <UModal
      v-model:open="confirmarQuitarAsientos"
      title="Quitar asientos a los coordinadores"
      description="Los coordinadores que ya tienen asiento lo van a perder. Sus habitaciones se conservan."
    >
      <template #footer>
        <div class="flex justify-end gap-3 w-full">
          <UButton
            variant="ghost"
            color="neutral"
            label="Cancelar"
            @click="cancelarQuitarAsientos"
          />
          <UButton
            color="warning"
            label="Quitar asientos y guardar"
            :loading="guardando"
            @click="guardarParametros"
          />
        </div>
      </template>
    </UModal>
  </UCard>
</template>
