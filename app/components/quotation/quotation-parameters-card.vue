<script setup lang="ts">
import type { Quotation } from '~/types/quotation';
import type { Traveler } from '~/types/traveler';

import { travelersByTravelQuery } from '~/queries/travelers';
import { travelDetailQuery } from '~/queries/travels';
import { sanitizeText } from '~/utils/form-validation';
import { pluralize } from '~/utils/pluralize';

type Props = {
  quotation: Quotation;
  /** Confirmed quotations show their parameters without the edit button. */
  readonly?: boolean;
};

const { quotation, readonly = false } = defineProps<Props>();

const quotationStore = useQuotationStore();
const travelerStore = useTravelerStore();
const queryCache = useQueryCache();
const toast = useToast();

const isEditingParameters = shallowRef(false);
const confirmRemoveSeats = shallowRef(false);
const isSaving = shallowRef(false);

const { data: travel } = useQuery(() => travelDetailQuery(quotation.travelId));

const coordinatorCount = computed(() =>
  travel.value?.coordinatorIds.length ?? 0,
);
const sellableSeats = computed(() => quotationStore.getSellableSeats(quotation.id, coordinatorCount.value));
const sellableSource = computed(() => {
  if (!quotation.coordinatorsTakeSeats || coordinatorCount.value === 0)
    return 'Todos los asientos se venden';
  const n = coordinatorCount.value;
  return `${quotation.totalSeats} − ${pluralize(n, 'coordinador')}`;
});

// The total seats are the sum of the quotation's bus capacities (a DB trigger keeps them),
// so they're shown read-only with where they come from.
const capacitySource = computed(() => {
  const n = quotationStore.getBusesByQuotation(quotation.id).length;
  if (n === 0)
    return 'Agrega autobuses a la cotización para calcularla';
  return `Suma de ${pluralize(n, 'autobús', 'autobuses')}`;
});

const paramsState = reactive({
  minimumSeatTarget: quotation.minimumSeatTarget,
  coordinatorsTakeSeats: quotation.coordinatorsTakeSeats,
  notes: quotation.notes ?? '',
});

function openEditParameters() {
  paramsState.minimumSeatTarget = quotation.minimumSeatTarget;
  paramsState.coordinatorsTakeSeats = quotation.coordinatorsTakeSeats;
  paramsState.notes = quotation.notes ?? '';
  isEditingParameters.value = true;
}

function closeEditParameters() {
  isEditingParameters.value = false;
}

// Sanitized proxy: filters out invalid characters while the user types (no Zod schema for this quick-edit form)
const paramsNotesInput = useSanitizedModel(() => paramsState.notes ?? '', v => paramsState.notes = v, sanitizeText);

function cancelRemoveSeats() {
  confirmRemoveSeats.value = false;
}

// When coordinators stop taking passenger seats, the ones already seated lose their seat
// (their rooms stay). Asks first if anyone would be affected.
async function saveParameters() {
  const removesSeats = quotation.coordinatorsTakeSeats && !paramsState.coordinatorsTakeSeats;
  if (removesSeats && !confirmRemoveSeats.value) {
    // Fresh from the server (fetch ignores staleTime): this decides whether to ask first.
    // If it can't be checked, stop: we'd take seats away without asking.
    let seated: Traveler[];
    try {
      const { data } = await queryCache.fetch(queryCache.ensure(travelersByTravelQuery(quotation.travelId)));
      seated = (data?.travelers ?? []).filter(t => t.kind === 'coordinator' && t.seat !== null);
    }
    catch (e) {
      toast.add({
        title: 'No se pudieron revisar los coordinadores',
        description: e instanceof Error ? e.message : undefined,
        color: 'error',
      });
      return;
    }
    if (seated.length > 0) {
      confirmRemoveSeats.value = true;
      return;
    }
  }
  confirmRemoveSeats.value = false;

  isSaving.value = true;
  try {
    if (removesSeats)
      await travelerStore.clearCoordinatorSeats(quotation.travelId);
    const updated = await quotationStore.updateQuotation(quotation.id, {
      minimumSeatTarget: paramsState.minimumSeatTarget,
      coordinatorsTakeSeats: paramsState.coordinatorsTakeSeats,
      notes: paramsState.notes,
    });
    if (!updated)
      throw new Error(quotationStore.error ?? 'No se pudieron guardar los parámetros');
    isEditingParameters.value = false;
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
    isSaving.value = false;
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
          v-if="!readonly && !isEditingParameters"
          icon="i-lucide-pencil"
          size="xs"
          variant="ghost"
          color="neutral"
          label="Editar"
          @click="openEditParameters"
        />
      </div>
    </template>

    <div v-if="!isEditingParameters" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <p class="text-xs text-muted mb-1">
          Capacidad total de asientos
        </p>
        <p class="font-medium">
          {{ quotation.totalSeats }}
        </p>
        <p class="text-xs text-muted">
          {{ capacitySource }}
        </p>
      </div>
      <div>
        <p class="text-xs text-muted mb-1">
          Asientos vendibles
        </p>
        <p class="font-medium">
          {{ sellableSeats }}
        </p>
        <p class="text-xs text-muted">
          {{ sellableSource }}
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
            {{ quotation.totalSeats }} · {{ capacitySource }}
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
        :description="`Resta ${pluralize(coordinatorCount, 'coordinador')} de los asientos vendibles y permite asignarles asiento. Si no, viajan sin asiento de pasajero (solo habitación).`"
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
          @click="closeEditParameters"
        />
        <UButton
          label="Guardar"
          :loading="isSaving"
          @click="saveParameters"
        />
      </div>
    </div>

    <UModal
      v-model:open="confirmRemoveSeats"
      title="Quitar asientos a los coordinadores"
      description="Los coordinadores que ya tienen asiento lo van a perder. Sus habitaciones se conservan."
    >
      <template #footer>
        <div class="flex justify-end gap-3 w-full">
          <UButton
            variant="ghost"
            color="neutral"
            label="Cancelar"
            @click="cancelRemoveSeats"
          />
          <UButton
            color="warning"
            label="Quitar asientos y guardar"
            :loading="isSaving"
            @click="saveParameters"
          />
        </div>
      </template>
    </UModal>
  </UCard>
</template>
