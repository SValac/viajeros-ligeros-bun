<script setup lang="ts">
import { z } from 'zod';

import type { Bus } from '~/types/bus';
import type { CostSplitType, QuotationBus, QuotationBusStatus } from '~/types/quotation';

import { travelersByTravelQuery } from '~/queries/travelers';
import { travelDetailQuery } from '~/queries/travels';
import { businessNameSchema, sanitizeBusinessName, sanitizeText, textSchema } from '~/utils/form-validation';
import { PAYMENT_TYPE_OPTIONS } from '~/utils/payment-type';

type Props = {
  quotationId: string;
  open: boolean;
  /** Bus to edit; without it, the modal adds a new one */
  bus?: QuotationBus | null;
};

type Emits = {
  (e: 'update:open', value: boolean): void;
  (e: 'added'): void;
  (e: 'updated'): void;
};

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const quotationStore = useQuotationStore();
const providerStore = useProviderStore();
const busStore = useBusStore();
const toast = useToast();

const isEditing = computed(() => !!props.bus);

// Available bus agencies
const availableAgencies = computed(() =>
  providerStore.getProvidersByCategory('bus_agencies').filter(p => p.active),
);

const agencySelectItems = computed(() =>
  availableAgencies.value.map(p => ({ value: p.id, label: p.name })),
);

const statusOptions: { label: string; value: QuotationBusStatus }[] = [
  { label: 'Apartado', value: 'reserved' },
  { label: 'Confirmado', value: 'confirmed' },
  { label: 'Pendiente', value: 'pending' },
];

const splitTypeOptions: { label: string; value: CostSplitType }[] = [
  { label: 'Asientos mínimos objetivo', value: 'minimum' },
  { label: 'Asientos vendibles', value: 'total' },
];

const busSchema = z.object({
  providerId: z.string({ message: 'Selecciona una agencia' }).min(1, 'Selecciona una agencia'),
  unitNumber: businessNameSchema({ min: 1, max: 50 }),
  capacity: z.number({ message: 'Ingresa la capacidad' }).int().positive('Debe ser mayor a 0'),
  status: z.enum(['reserved', 'confirmed', 'pending']),
  totalCost: z.number({ message: 'Ingresa el costo total' }).positive('El costo debe ser mayor a 0'),
  splitType: z.enum(['minimum', 'total']),
  paymentMethod: z.enum(['cash', 'transfer']),
  remarks: textSchema({ max: 500 }).optional(),
  confirmed: z.boolean(),
  notes: textSchema({ max: 500 }).optional(),
});

type BusSchema = z.infer<typeof busSchema>;

const formState = reactive<Partial<BusSchema>>({
  providerId: '',
  unitNumber: '',
  capacity: undefined,
  status: 'reserved',
  totalCost: undefined,
  splitType: 'minimum',
  paymentMethod: 'cash',
  remarks: '',
  confirmed: false,
  notes: '',
});

// Sanitized proxies: filter out invalid characters while the user types
const unitNumberInput = useSanitizedModel(() => formState.unitNumber ?? '', v => formState.unitNumber = v, sanitizeBusinessName);
const remarksInput = useSanitizedModel(() => formState.remarks ?? '', v => formState.remarks = v, sanitizeText);

const selectedBus = ref<Bus | null>(null);
// When editing, the saved unit doesn't come from the catalog: it's kept until the user picks another
const keepsCurrentUnit = shallowRef(false);
const hasUnit = computed(() => !!selectedBus.value || keepsCurrentUnit.value);

// Catalog units for the selected agency
const agencyUnits = computed<Bus[]>(() => {
  if (!formState.providerId)
    return [];
  return busStore.getBusesByProvider(formState.providerId);
});

// Highest occupied seat on the travel's bus: when editing, it can't switch to a smaller unit
const travelId = computed(() => quotationStore.quotations.find(c => c.id === props.quotationId)?.travelId);
const { data: travel } = useQuery(() => travelDetailQuery(travelId.value));
const { data: travelerData, refetch: refetchTravelers } = useQuery(() => travelersByTravelQuery(travelId.value));
const highestOccupiedSeat = computed(() => {
  if (!props.bus || !travelId.value)
    return 0;
  const travelBus = travel.value?.buses?.find(b => b.quotationBusId === props.bus!.id);
  if (!travelBus)
    return 0;
  return (travelerData.value?.travelers ?? [])
    .filter(t => t.travelBusId === travelBus.id)
    .reduce((max, t) => Math.max(max, t.seat ?? 0), 0);
});

// How many people the cost is split among: minimum target seats or sellable seats
const personDivisor = computed(() => quotationStore.getCostDivisor(props.quotationId, formState.splitType ?? 'minimum', travel.value?.coordinatorIds.length ?? 0));

// Fill the form when it opens (add: empty; edit: the bus data)
watch(() => props.open, (open) => {
  if (!open)
    return;
  resetForm();
  if (props.bus) {
    formState.providerId = props.bus.providerId;
    formState.unitNumber = props.bus.unitNumber;
    formState.capacity = props.bus.capacity;
    formState.status = props.bus.status;
    formState.totalCost = props.bus.totalCost;
    formState.splitType = props.bus.splitType ?? 'minimum';
    formState.paymentMethod = props.bus.paymentMethod ?? 'cash';
    formState.remarks = props.bus.remarks ?? '';
    formState.confirmed = props.bus.confirmed ?? false;
    formState.notes = props.bus.notes ?? '';
    keepsCurrentUnit.value = true;
  }
}, { immediate: true });

// When the agency changes (only by the user), clear the unit selection
function onAgencyChange(providerId: string) {
  if (providerId === formState.providerId)
    return;
  formState.providerId = providerId;
  deselectUnit();
}

function selectUnit(bus: Bus) {
  selectedBus.value = bus;
  keepsCurrentUnit.value = false;
  const partes = [bus.brand, bus.model, bus.year ? `(${bus.year})` : null].filter(Boolean);
  formState.unitNumber = partes.length > 0 ? partes.join(' ') : `Unidad ${bus.id.slice(-6)}`;
  formState.capacity = bus.seatCount;
}

function deselectUnit() {
  selectedBus.value = null;
  keepsCurrentUnit.value = false;
  formState.unitNumber = '';
  formState.capacity = undefined;
}

function getBusLabel(bus: Bus): string {
  const partes = [bus.brand, bus.model, bus.year ? `(${bus.year})` : null].filter(Boolean);
  return partes.length > 0 ? partes.join(' ') : 'Sin identificación';
}

function resetForm() {
  formState.providerId = '';
  formState.unitNumber = '';
  formState.capacity = undefined;
  formState.status = 'reserved';
  formState.totalCost = undefined;
  formState.splitType = 'minimum';
  formState.paymentMethod = 'cash';
  formState.remarks = '';
  formState.confirmed = false;
  formState.notes = '';
  selectedBus.value = null;
  keepsCurrentUnit.value = false;
}

async function handleSubmit() {
  const result = busSchema.safeParse(formState);
  if (!result.success) {
    toast.add({
      title: 'Error en el formulario',
      description: result.error.issues.map(e => e.message).join(', '),
      color: 'error',
    });
    return;
  }

  const data = {
    ...result.data,
    notes: result.data.notes || undefined,
    remarks: result.data.remarks || undefined,
  };

  if (props.bus) {
    await submitEdit(props.bus, data);
    return;
  }

  const response = await quotationStore.addBusQuotation({
    quotationId: props.quotationId,
    ...data,
  });

  if ('error' in response) {
    toast.add({ title: 'Error', description: response.error, color: 'error' });
    return;
  }

  toast.add({ title: 'Autobús agregado', color: 'success' });
  resetForm();
  emit('added');
  emit('update:open', false);
}

async function submitEdit(bus: QuotationBus, data: BusSchema) {
  const duplicate = quotationStore.getBusesByQuotation(props.quotationId).some(
    b => b.id !== bus.id && b.providerId === data.providerId && b.unitNumber === data.unitNumber,
  );
  if (duplicate) {
    toast.add({ title: 'Error', description: 'Este número de unidad ya existe para este proveedor en la cotización', color: 'error' });
    return;
  }

  // Without the travelers `asientoMaximoOcupado` is 0 and the smaller-unit check below would
  // let anything through. Still loading or the fetch failed: ask again so the next click has them.
  if (props.bus && !travelerData.value) {
    toast.add({
      title: 'Viajeros sin cargar',
      description: 'No se han cargado los viajeros del viaje. Intenta guardar de nuevo en un momento.',
      color: 'warning',
    });
    refetchTravelers();
    return;
  }

  if (data.capacity < highestOccupiedSeat.value) {
    toast.add({
      title: 'Unidad muy pequeña',
      description: `Hay un viajero en el asiento ${highestOccupiedSeat.value} y la unidad tiene ${data.capacity}. Muévelo o elige otra unidad.`,
      color: 'error',
    });
    return;
  }

  const updated = await quotationStore.updateBusQuotation(bus.id, data);
  if (!updated) {
    toast.add({ title: 'No se pudo actualizar el autobús', description: quotationStore.error ?? 'Intenta de nuevo', color: 'error' });
    return;
  }

  toast.add({ title: 'Autobús actualizado', color: 'success' });
  emit('updated');
  emit('update:open', false);
}

function handleCancel() {
  resetForm();
  emit('update:open', false);
}
</script>

<template>
  <UModal
    :open="props.open"
    :title="isEditing ? 'Editar Autobús' : 'Agregar Autobús'"
    :description="isEditing ? 'Actualiza los datos del autobús apartado' : 'Registra un autobús apartado para esta cotización'"
    class="sm:max-w-lg"
    @update:open="(v) => emit('update:open', v)"
  >
    <template #body>
      <form class="space-y-5" @submit.prevent="handleSubmit">
        <!-- Agency -->
        <UFormField label="Agencia de Autobús" required>
          <UAlert
            v-if="availableAgencies.length === 0"
            icon="i-lucide-info"
            color="neutral"
            variant="subtle"
            title="No hay agencias de autobús registradas"
          />
          <USelect
            v-else
            :model-value="formState.providerId"
            :items="agencySelectItems"
            placeholder="Selecciona una agencia"
            @update:model-value="onAgencyChange"
          />
        </UFormField>

        <!-- Agency units -->
        <template v-if="formState.providerId">
          <div class="space-y-3">
            <label class="text-sm font-medium">Unidad <span class="text-error">*</span></label>

            <!-- Selected unit (from the catalog or the one saved when editing) -->
            <div
              v-if="hasUnit"
              class="border border-primary rounded-lg p-4 bg-primary/5"
            >
              <div class="flex items-start justify-between gap-2">
                <div>
                  <p class="font-medium">
                    {{ selectedBus ? getBusLabel(selectedBus) : formState.unitNumber }}
                  </p>
                  <p class="text-sm text-muted">
                    {{ selectedBus ? selectedBus.seatCount : formState.capacity }} asientos
                  </p>
                </div>
                <UButton
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-x"
                  :aria-label="isEditing ? 'Cambiar unidad' : 'Quitar unidad'"
                  @click="deselectUnit"
                />
              </div>
            </div>

            <!-- No units -->
            <UAlert
              v-else-if="agencyUnits.length === 0"
              icon="i-lucide-bus-front"
              color="warning"
              variant="subtle"
              title="Esta agencia no tiene unidades registradas"
            >
              <template #description>
                <p class="text-sm mt-1">
                  Agrega las unidades desde el perfil de la agencia antes de continuar.
                </p>
                <UButton
                  class="mt-2"
                  size="xs"
                  variant="outline"
                  icon="i-lucide-external-link"
                  label="Ir a la agencia"
                  :to="`/providers/bus-agencies/${formState.providerId}`"
                  target="_blank"
                />
              </template>
            </UAlert>

            <!-- Unit selector -->
            <div v-else class="border rounded-lg divide-y max-h-52 overflow-y-auto">
              <button
                v-for="unit in agencyUnits"
                :key="unit.id"
                type="button"
                class="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-elevated transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                :disabled="unit.seatCount < highestOccupiedSeat"
                @click="selectUnit(unit)"
              >
                <div>
                  <p class="font-medium text-sm">
                    {{ getBusLabel(unit) }}
                  </p>
                  <p class="text-xs text-muted">
                    {{ unit.seatCount }} asientos
                    <template v-if="unit.seatCount < highestOccupiedSeat">
                      · hay viajeros hasta el asiento {{ highestOccupiedSeat }}
                    </template>
                  </p>
                </div>
                <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-muted" />
              </button>
            </div>
          </div>
        </template>

        <!-- Fields shown after picking a unit -->
        <template v-if="hasUnit">
          <USeparator label="Identificación" />

          <UFormField label="Identificador de la Unidad" required>
            <UInput v-model="unitNumberInput" placeholder="Ej. BUS-001 o Marca Modelo" />
          </UFormField>

          <!-- Capacity isn't editable: it comes from the catalog unit (shown in the card above) -->
          <UFormField label="Estado">
            <USelect v-model="formState.status" :items="statusOptions" />
          </UFormField>

          <USeparator label="Cotización" />

          <UFormField label="Costo Total" required>
            <MoneyInput v-model="formState.totalCost" />
          </UFormField>

          <UFormField
            label="Dividir entre"
            :help="`Entre ${personDivisor} personas`"
            required
          >
            <USelect v-model="formState.splitType" :items="splitTypeOptions" />
          </UFormField>

          <UFormField label="Método de Pago" required>
            <USelect v-model="formState.paymentMethod" :items="PAYMENT_TYPE_OPTIONS" />
          </UFormField>

          <UFormField label="Observaciones">
            <UTextarea
              v-model="remarksInput"
              placeholder="Notas sobre el servicio..."
              :rows="2"
            />
          </UFormField>

          <UFormField name="confirmado">
            <UCheckbox v-model="formState.confirmed" label="Servicio confirmado por el proveedor" />
          </UFormField>
        </template>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-2">
          <UButton
            type="button"
            variant="ghost"
            color="neutral"
            label="Cancelar"
            @click="handleCancel"
          />
          <UButton
            type="submit"
            :label="isEditing ? 'Guardar cambios' : 'Agregar Autobús'"
            :disabled="!hasUnit"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
