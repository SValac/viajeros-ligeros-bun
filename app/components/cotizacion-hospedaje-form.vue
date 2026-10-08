<script setup lang="ts">
import { z } from 'zod';

import type { QuotationAccommodationFormData } from '~/types/quotation';

type Props = {
  quotationId: string;
  open: boolean;
};

type Emits = {
  (e: 'update:open', value: boolean): void;
  (e: 'hospedajeAgregado'): void;
};

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const cotizacionStore = useCotizacionStore();
const providerStore = useProviderStore();
const hotelRoomStore = useHotelRoomStore();
const toast = useToast();

// IDs de hoteles ya agregados a esta cotización
const hotelsYaAgregados = computed(() => {
  return new Set(
    cotizacionStore.getHospedajesByQuotation(props.quotationId).map(h => h.providerId),
  );
});

// Hoteles disponibles (providers con categoría 'accommodation', activos y no duplicados)
const hotelesDisponibles = computed(() => {
  return providerStore.getProvidersByCategory('accommodation')
    .filter(p => p.active && !hotelsYaAgregados.value.has(p.id));
});

const hotelesSelectItems = computed(() =>
  hotelesDisponibles.value.map(p => ({ value: p.id, label: p.name })),
);

const metodoPagoOptions = [
  { label: 'Efectivo', value: 'cash' },
  { label: 'Transferencia', value: 'transfer' },
];

// Esquema de validación
const formSchema = z.object({
  quotationId: z.string(),
  providerId: z.string({ message: 'Selecciona un hotel' }),
  nightCount: z.number({ message: 'Ingresa la cantidad de noches' })
    .int()
    .positive('Debe ser mayor a 0'),
  paymentMethod: z.enum(['cash', 'transfer']),
  details: z.array(z.object({
    roomTypeId: z.string(),
    pricePerNight: z.number().positive(),
    maxOccupancy: z.number().int().positive(),
  })).min(1, 'Selecciona al menos un tipo de habitación'),
});

type FormSchema = z.infer<typeof formSchema>;

const formState = reactive<Partial<FormSchema>>({
  quotationId: props.quotationId,
  providerId: '',
  nightCount: 1,
  paymentMethod: 'cash',
  details: [],
});

// Tipos de habitación del hotel seleccionado
const tiposHabitacionSeleccionado = computed(() => {
  if (!formState.providerId)
    return [];
  const hotelRoomData = hotelRoomStore.getRoomDataByProviderId(formState.providerId);
  if (!hotelRoomData)
    return [];
  return hotelRoomData.roomTypes;
});

// Al cambiar de hotel, reiniciar detalles
watch(() => formState.providerId, () => {
  formState.details = [];
});

async function handleSubmit() {
  const result = formSchema.safeParse(formState);
  if (!result.success) {
    toast.add({
      title: 'Error en el formulario',
      description: result.error.issues.map((e: any) => e.message).join(', '),
      color: 'error',
    });
    return;
  }

  const response = await cotizacionStore.addHospedajeQuotation(result.data as QuotationAccommodationFormData);
  if ('error' in response) {
    toast.add({
      title: 'Error',
      description: response.error,
      color: 'error',
    });
    return;
  }

  toast.add({
    title: 'Hospedaje agregado',
    description: 'Agrega sus habitaciones en la pestaña Habitaciones del viaje.',
    color: 'success',
  });

  // Reiniciar form
  formState.quotationId = props.quotationId;
  formState.providerId = '';
  formState.nightCount = 1;
  formState.paymentMethod = 'cash';
  formState.details = [];

  emit('hospedajeAgregado');
  emit('update:open', false);
}

function handleCancel() {
  formState.quotationId = props.quotationId;
  formState.providerId = '';
  formState.nightCount = 1;
  formState.paymentMethod = 'cash';
  formState.details = [];
  emit('update:open', false);
}
</script>

<template>
  <UModal
    :open="props.open"
    title="Agregar Hospedaje"
    description="Selecciona un hotel y los tipos de habitaciones"
    class="sm:max-w-2xl"
    @update:open="(v) => emit('update:open', v)"
  >
    <template #body>
      <form class="space-y-6" @submit.prevent="handleSubmit">
        <!-- Seleccionar Hotel -->
        <UFormField label="Hotel" required>
          <UAlert
            v-if="hotelesDisponibles.length === 0"
            icon="i-lucide-info"
            color="neutral"
            variant="subtle"
            title="Todos los hoteles ya fueron agregados a esta cotización"
          />
          <USelect
            v-else
            v-model="formState.providerId"
            :items="hotelesSelectItems"
            placeholder="Selecciona un hotel"
          />
        </UFormField>

        <!-- Cantidad de Noches -->
        <UFormField label="Cantidad de Noches" required>
          <UInput
            v-model.number="formState.nightCount"
            type="number"
            min="1"
            placeholder="Ej. 3"
          />
        </UFormField>

        <!-- Método de Pago -->
        <UFormField label="Método de Pago" required>
          <USelect
            v-model="formState.paymentMethod"
            :items="metodoPagoOptions"
          />
        </UFormField>

        <!-- Tipos de Habitación -->
        <CotizacionHospedajeTipos
          v-if="formState.providerId"
          :model-value="formState.details ?? []"
          :room-types="tiposHabitacionSeleccionado"
          :night-count="formState.nightCount ?? 1"
          @update:model-value="(details) => formState.details = details"
        />

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
            label="Agregar Hospedaje"
            :disabled="hotelesDisponibles.length === 0"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
