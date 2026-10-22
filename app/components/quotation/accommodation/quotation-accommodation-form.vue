<script setup lang="ts">
import { z } from 'zod';

import type { QuotationAccommodationFormData } from '~/types/quotation';

import { PAYMENT_TYPE_OPTIONS } from '~/utils/payment-type';

type Props = {
  quotationId: string;
  open: boolean;
};

type Emits = {
  (e: 'update:open', value: boolean): void;
  (e: 'added'): void;
};

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const quotationStore = useQuotationStore();
const providerStore = useProviderStore();
const hotelRoomStore = useHotelRoomStore();
const toast = useToast();

// IDs of hotels already added to this quotation
const alreadyAddedHotels = computed(() => {
  return new Set(
    quotationStore.getAccommodationsByQuotation(props.quotationId).map(h => h.providerId),
  );
});

// Available hotels (providers with category 'accommodation', active and not duplicated)
const availableHotels = computed(() => {
  return providerStore.getProvidersByCategory('accommodation')
    .filter(p => p.active && !alreadyAddedHotels.value.has(p.id));
});

const hotelSelectItems = computed(() =>
  availableHotels.value.map(p => ({ value: p.id, label: p.name })),
);

// Validation schema
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

// Room types of the selected hotel
const selectedRoomTypes = computed(() => {
  if (!formState.providerId)
    return [];
  const hotelRoomData = hotelRoomStore.getRoomDataByProviderId(formState.providerId);
  if (!hotelRoomData)
    return [];
  return hotelRoomData.roomTypes;
});

// When the hotel changes, reset the details
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

  const response = await quotationStore.addQuotationAccommodation(result.data as QuotationAccommodationFormData);
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

  // Reset form
  formState.quotationId = props.quotationId;
  formState.providerId = '';
  formState.nightCount = 1;
  formState.paymentMethod = 'cash';
  formState.details = [];

  emit('added');
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
        <!-- Select Hotel -->
        <UFormField label="Hotel" required>
          <UAlert
            v-if="availableHotels.length === 0"
            icon="i-lucide-info"
            color="neutral"
            variant="subtle"
            title="Todos los hoteles ya fueron agregados a esta cotización"
          />
          <USelect
            v-else
            v-model="formState.providerId"
            :items="hotelSelectItems"
            placeholder="Selecciona un hotel"
          />
        </UFormField>

        <!-- Number of Nights -->
        <UFormField label="Cantidad de Noches" required>
          <UInput
            v-model.number="formState.nightCount"
            type="number"
            min="1"
            placeholder="Ej. 3"
          />
        </UFormField>

        <!-- Payment Method -->
        <UFormField label="Método de Pago" required>
          <USelect
            v-model="formState.paymentMethod"
            :items="PAYMENT_TYPE_OPTIONS"
          />
        </UFormField>

        <!-- Room Types -->
        <QuotationAccommodationRoomTypes
          v-if="formState.providerId"
          :model-value="formState.details ?? []"
          :room-types="selectedRoomTypes"
          :night-count="formState.nightCount ?? 1"
          @update:model-value="(details) => formState.details = details"
        />

        <!-- Actions -->
        <FormActions
          submit-label="Agregar hospedaje"
          :disabled="availableHotels.length === 0"
          @cancel="handleCancel"
        />
      </form>
    </template>
  </UModal>
</template>
