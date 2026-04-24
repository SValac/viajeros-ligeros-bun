<script setup lang="ts">
import { z } from 'zod';

import type { Bus } from '~/types/bus';
import type { CostSplitType, QuotationBusStatus } from '~/types/quotation';

type Props = {
  quotationId: string;
  open: boolean;
};

type Emits = {
  (e: 'update:open', value: boolean): void;
  (e: 'busAgregado'): void;
};

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const cotizacionStore = useCotizacionStore();
const providerStore = useProviderStore();
const busStore = useBusStore();
const toast = useToast();

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
  { label: 'Capacidad total del bus', value: 'total' },
];

const busSchema = z.object({
  providerId: z.string({ message: 'Selecciona una agencia' }).min(1, 'Selecciona una agencia'),
  unitNumber: z.string({ message: 'Número de unidad es requerido' }).min(1).max(50),
  capacity: z.number({ message: 'Ingresa la capacidad' }).int().positive('Debe ser mayor a 0'),
  status: z.enum(['reserved', 'confirmed', 'pending']),
  totalCost: z.number({ message: 'Ingresa el costo total' }).positive('El costo debe ser mayor a 0'),
  splitType: z.enum(['minimum', 'total']),
  paymentMethod: z.enum(['cash', 'transfer']),
  remarks: z.string().max(500).optional(),
  confirmed: z.boolean(),
  notes: z.string().max(500).optional(),
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

const busSeleccionado = ref<Bus | null>(null);

// Unidades del catálogo para la agencia seleccionada
const unidadesAgencia = computed<Bus[]>(() => {
  if (!formState.providerId)
    return [];
  return busStore.getBusesByProvider(formState.providerId);
});

// Al cambiar agencia, limpiar selección de unidad
watch(() => formState.providerId, () => {
  busSeleccionado.value = null;
  formState.unitNumber = '';
  formState.capacity = undefined;
});

function seleccionarUnidad(bus: Bus) {
  busSeleccionado.value = bus;
  const partes = [bus.brand, bus.model, bus.year ? `(${bus.year})` : null].filter(Boolean);
  formState.unitNumber = partes.length > 0 ? partes.join(' ') : `Unidad ${bus.id.slice(-6)}`;
  formState.capacity = bus.seatCount;
  // Pre-llenar costo con precio de renta del catálogo si existe
  if (bus.rentalPrice && !formState.totalCost) {
    formState.totalCost = bus.rentalPrice;
  }
}

function deseleccionarUnidad() {
  busSeleccionado.value = null;
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
}

function handleSubmit() {
  const result = busSchema.safeParse(formState);
  if (!result.success) {
    toast.add({
      title: 'Error en el formulario',
      description: result.error.issues.map(e => e.message).join(', '),
      color: 'error',
    });
    return;
  }

  const response = cotizacionStore.addBusQuotation({
    quotationId: props.quotationId,
    ...result.data,
    notes: result.data.notes || undefined,
    remarks: result.data.remarks || undefined,
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

function handleCancel() {
  resetForm();
  emit('update:open', false);
}
</script>

<template>
  <UModal
    :open="props.open"
    title="Agregar Autobús"
    description="Registra un autobús apartado para esta cotización"
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
            v-model="formState.providerId"
            :items="agenciasSelectItems"
            placeholder="Selecciona una agencia"
          />
        </UFormField>

        <!-- Unidades de la agencia -->
        <template v-if="formState.providerId">
          <div class="space-y-3">
            <label class="text-sm font-medium">Unidad <span class="text-error">*</span></label>

            <!-- Sin unidades -->
            <UAlert
              v-if="unidadesAgencia.length === 0"
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

            <!-- Lista de unidades -->
            <template v-else>
              <!-- Unidad seleccionada -->
              <div
                v-if="busSeleccionado"
                class="border border-primary rounded-lg p-4 bg-primary/5"
              >
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <p class="font-medium">
                      {{ getBusLabel(busSeleccionado) }}
                    </p>
                    <p class="text-sm text-muted">
                      {{ busSeleccionado.seatCount }} asientos
                      <template v-if="busSeleccionado.rentalPrice">
                        · ${{ busSeleccionado.rentalPrice.toLocaleString('es-MX') }} renta ref.
                      </template>
                    </p>
                  </div>
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-x"
                    @click="deseleccionarUnidad"
                  />
                </div>
              </div>

              <!-- Selector de unidades -->
              <div v-else class="border rounded-lg divide-y max-h-52 overflow-y-auto">
                <button
                  v-for="bus in unidadesAgencia"
                  :key="bus.id"
                  type="button"
                  class="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-elevated transition-colors"
                  @click="seleccionarUnidad(bus)"
                >
                  <div>
                    <p class="font-medium text-sm">
                      {{ getBusLabel(bus) }}
                    </p>
                    <p class="text-xs text-muted">
                      {{ bus.seatCount }} asientos
                      <template v-if="bus.rentalPrice">
                        · ${{ bus.rentalPrice.toLocaleString('es-MX') }}
                      </template>
                    </p>
                  </div>
                  <span class="i-lucide-chevron-right w-4 h-4 text-muted" />
                </button>
              </div>
            </template>
          </div>
        </template>

        <!-- Campos visibles después de seleccionar unidad -->
        <template v-if="busSeleccionado">
          <USeparator label="Identificación" />

          <UFormField label="Identificador de la Unidad" required>
            <UInput v-model="formState.unitNumber" placeholder="Ej. BUS-001 o Marca Modelo" />
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Capacidad (asientos)" required>
              <UInput
                v-model.number="formState.capacity"
                type="number"
                min="1"
              />
            </UFormField>
            <UFormField label="Estado">
              <USelect v-model="formState.status" :items="estadoOptions" />
            </UFormField>
          </div>

          <USeparator label="Cotización" />

          <UFormField label="Costo Total" required>
            <UInput
              v-model.number="formState.totalCost"
              type="number"
              placeholder="0.00"
            />
          </UFormField>

          <UFormField label="Dividir entre" required>
            <USelect v-model="formState.splitType" :items="tipoDivisionOptions" />
          </UFormField>

          <UFormField label="Método de Pago" required>
            <USelect v-model="formState.paymentMethod" :items="metodoPagoOptions" />
          </UFormField>

          <UFormField label="Observaciones">
            <UTextarea
              v-model="formState.remarks"
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
            label="Agregar Autobús"
            :disabled="!busSeleccionado"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
