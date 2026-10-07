<script setup lang="ts">
import { z } from 'zod';

import type { Bus } from '~/types/bus';
import type { CostSplitType, QuotationBus, QuotationBusStatus } from '~/types/quotation';

import { businessNameSchema, sanitizeBusinessName, sanitizeText, textSchema } from '~/utils/form-validation';

type Props = {
  quotationId: string;
  open: boolean;
  /** Bus a editar; sin él, el modal agrega uno nuevo */
  bus?: QuotationBus | null;
};

type Emits = {
  (e: 'update:open', value: boolean): void;
  (e: 'busAgregado'): void;
  (e: 'busActualizado'): void;
};

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const cotizacionStore = useCotizacionStore();
const providerStore = useProviderStore();
const busStore = useBusStore();
const travelsStore = useTravelsStore();
const travelerStore = useTravelerStore();
const toast = useToast();

const isEditing = computed(() => !!props.bus);

// Agencias de autobús disponibles
const agenciasDisponibles = computed(() =>
  providerStore.getProvidersByCategory('bus_agencies').filter(p => p.active),
);

const agenciasSelectItems = computed(() =>
  agenciasDisponibles.value.map(p => ({ value: p.id, label: p.name })),
);

const estadoOptions: { label: string; value: QuotationBusStatus }[] = [
  { label: 'Apartado', value: 'reserved' },
  { label: 'Confirmado', value: 'confirmed' },
  { label: 'Pendiente', value: 'pending' },
];

const metodoPagoOptions = [
  { label: 'Efectivo', value: 'cash' },
  { label: 'Transferencia', value: 'transfer' },
];

const tipoDivisionOptions: { label: string; value: CostSplitType }[] = [
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

// Proxies sanitizados: filtran caracteres inválidos mientras el usuario escribe
const unitNumberInput = useSanitizedModel(() => formState.unitNumber ?? '', v => formState.unitNumber = v, sanitizeBusinessName);
const remarksInput = useSanitizedModel(() => formState.remarks ?? '', v => formState.remarks = v, sanitizeText);

const busSeleccionado = ref<Bus | null>(null);
// Al editar, la unidad guardada no viene del catálogo: se conserva hasta que el usuario elija otra
const conservaUnidadActual = shallowRef(false);
const tieneUnidad = computed(() => !!busSeleccionado.value || conservaUnidadActual.value);

// Unidades del catálogo para la agencia seleccionada
const unidadesAgencia = computed<Bus[]>(() => {
  if (!formState.providerId)
    return [];
  return busStore.getBusesByProvider(formState.providerId);
});

// Asiento más alto ocupado en el bus del viaje: al editar, no se puede cambiar a una unidad más chica
const travelId = computed(() => cotizacionStore.cotizaciones.find(c => c.id === props.quotationId)?.travelId);
const asientoMaximoOcupado = computed(() => {
  if (!props.bus || !travelId.value)
    return 0;
  const travelBus = travelsStore.getTravelById(travelId.value)?.buses?.find(b => b.quotationBusId === props.bus!.id);
  if (!travelBus)
    return 0;
  return travelerStore.getOccupantsByTravel(travelId.value)
    .filter(t => t.travelBusId === travelBus.id)
    .reduce((max, t) => Math.max(max, t.seat ?? 0), 0);
});

// Entre cuántas personas se reparte el costo: asientos mínimos objetivo o asientos vendibles
const divisorPersonas = computed(() => cotizacionStore.getDivisorCosto(props.quotationId, formState.splitType ?? 'minimum'));

// Llenar el formulario al abrir (agregar: vacío; editar: datos del bus)
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
    conservaUnidadActual.value = true;
    if (travelId.value)
      travelerStore.fetchByTravel(travelId.value);
  }
}, { immediate: true });

// Al cambiar agencia (solo por el usuario), limpiar selección de unidad
function onAgenciaChange(providerId: string) {
  if (providerId === formState.providerId)
    return;
  formState.providerId = providerId;
  deseleccionarUnidad();
}

function seleccionarUnidad(bus: Bus) {
  busSeleccionado.value = bus;
  conservaUnidadActual.value = false;
  const partes = [bus.brand, bus.model, bus.year ? `(${bus.year})` : null].filter(Boolean);
  formState.unitNumber = partes.length > 0 ? partes.join(' ') : `Unidad ${bus.id.slice(-6)}`;
  formState.capacity = bus.seatCount;
}

function deseleccionarUnidad() {
  busSeleccionado.value = null;
  conservaUnidadActual.value = false;
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
  busSeleccionado.value = null;
  conservaUnidadActual.value = false;
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

  const response = await cotizacionStore.addBusQuotation({
    quotationId: props.quotationId,
    ...data,
  });

  if ('error' in response) {
    toast.add({ title: 'Error', description: response.error, color: 'error' });
    return;
  }

  toast.add({ title: 'Autobús agregado', color: 'success' });
  resetForm();
  emit('busAgregado');
  emit('update:open', false);
}

async function submitEdit(bus: QuotationBus, data: BusSchema) {
  const duplicado = cotizacionStore.getBusesByQuotation(props.quotationId).some(
    b => b.id !== bus.id && b.providerId === data.providerId && b.unitNumber === data.unitNumber,
  );
  if (duplicado) {
    toast.add({ title: 'Error', description: 'Este número de unidad ya existe para este proveedor en la cotización', color: 'error' });
    return;
  }

  if (data.capacity < asientoMaximoOcupado.value) {
    toast.add({
      title: 'Unidad muy pequeña',
      description: `Hay un viajero en el asiento ${asientoMaximoOcupado.value} y la unidad tiene ${data.capacity}. Muévelo o elige otra unidad.`,
      color: 'error',
    });
    return;
  }

  const updated = await cotizacionStore.updateBusQuotation(bus.id, data);
  if (!updated) {
    toast.add({ title: 'No se pudo actualizar el autobús', description: cotizacionStore.error ?? 'Intenta de nuevo', color: 'error' });
    return;
  }

  toast.add({ title: 'Autobús actualizado', color: 'success' });
  emit('busActualizado');
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
        <!-- Agencia -->
        <UFormField label="Agencia de Autobús" required>
          <UAlert
            v-if="agenciasDisponibles.length === 0"
            icon="i-lucide-info"
            color="neutral"
            variant="subtle"
            title="No hay agencias de autobús registradas"
          />
          <USelect
            v-else
            :model-value="formState.providerId"
            :items="agenciasSelectItems"
            placeholder="Selecciona una agencia"
            @update:model-value="onAgenciaChange"
          />
        </UFormField>

        <!-- Unidades de la agencia -->
        <template v-if="formState.providerId">
          <div class="space-y-3">
            <label class="text-sm font-medium">Unidad <span class="text-error">*</span></label>

            <!-- Unidad seleccionada (del catálogo o la guardada al editar) -->
            <div
              v-if="tieneUnidad"
              class="border border-primary rounded-lg p-4 bg-primary/5"
            >
              <div class="flex items-start justify-between gap-2">
                <div>
                  <p class="font-medium">
                    {{ busSeleccionado ? getBusLabel(busSeleccionado) : formState.unitNumber }}
                  </p>
                  <p class="text-sm text-muted">
                    {{ busSeleccionado ? busSeleccionado.seatCount : formState.capacity }} asientos
                  </p>
                </div>
                <UButton
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-x"
                  :aria-label="isEditing ? 'Cambiar unidad' : 'Quitar unidad'"
                  @click="deseleccionarUnidad"
                />
              </div>
            </div>

            <!-- Sin unidades -->
            <UAlert
              v-else-if="unidadesAgencia.length === 0"
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

            <!-- Selector de unidades -->
            <div v-else class="border rounded-lg divide-y max-h-52 overflow-y-auto">
              <button
                v-for="unidad in unidadesAgencia"
                :key="unidad.id"
                type="button"
                class="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-elevated transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                :disabled="unidad.seatCount < asientoMaximoOcupado"
                @click="seleccionarUnidad(unidad)"
              >
                <div>
                  <p class="font-medium text-sm">
                    {{ getBusLabel(unidad) }}
                  </p>
                  <p class="text-xs text-muted">
                    {{ unidad.seatCount }} asientos
                    <template v-if="unidad.seatCount < asientoMaximoOcupado">
                      · hay viajeros hasta el asiento {{ asientoMaximoOcupado }}
                    </template>
                  </p>
                </div>
                <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-muted" />
              </button>
            </div>
          </div>
        </template>

        <!-- Campos visibles después de seleccionar unidad -->
        <template v-if="tieneUnidad">
          <USeparator label="Identificación" />

          <UFormField label="Identificador de la Unidad" required>
            <UInput v-model="unitNumberInput" placeholder="Ej. BUS-001 o Marca Modelo" />
          </UFormField>

          <!-- La capacidad no se edita: viene de la unidad del catálogo (se ve en la tarjeta de arriba) -->
          <UFormField label="Estado">
            <USelect v-model="formState.status" :items="estadoOptions" />
          </UFormField>

          <USeparator label="Cotización" />

          <UFormField label="Costo Total" required>
            <MoneyInput v-model="formState.totalCost" />
          </UFormField>

          <UFormField
            label="Dividir entre"
            :help="`Entre ${divisorPersonas} personas`"
            required
          >
            <USelect v-model="formState.splitType" :items="tipoDivisionOptions" />
          </UFormField>

          <UFormField label="Método de Pago" required>
            <USelect v-model="formState.paymentMethod" :items="metodoPagoOptions" />
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

        <!-- Acciones -->
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
            :disabled="!tieneUnidad"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
