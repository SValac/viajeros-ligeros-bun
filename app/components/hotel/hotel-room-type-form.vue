<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';

import { z } from 'zod';

import type { HotelRoomType, HotelRoomTypeFormData } from '~/types/hotel-room';

import { areRoomTypesIdentical } from '~/utils/hotel-room-helpers';

const props = withDefaults(defineProps<{
  roomType?: HotelRoomType | null;
  existingTypes: HotelRoomType[];
  maxRooms: number;
  usedRooms: number;
}>(), {
  roomType: null,
});

const emit = defineEmits<{
  submit: [data: HotelRoomTypeFormData];
  cancel: [];
}>();

const toast = useToast();

const schema = z.object({
  maxOccupancy: z.number().int().min(1, 'Mínimo 1 persona').max(20, 'Máximo 20 personas'),
  roomCount: z.number().int().min(1, 'Mínimo 1 habitación'),
  beds: z.array(
    z.object({
      size: z.enum(['single', 'double', 'queen', 'king']),
      count: z.number().int().min(1).max(10),
    }),
  ).min(1, 'Agrega al menos una cama'),
  pricePerNight: z.number().positive('El precio debe ser mayor a 0'),
  additionalDetails: z.string().optional().or(z.literal('')),
});

const isEditing = computed(() => !!props.roomType);
const editingRooms = computed(() => props.roomType?.roomCount ?? 0);
const availableRooms = computed(() => props.maxRooms - props.usedRooms + editingRooms.value);

const state = ref<HotelRoomTypeFormData>({
  maxOccupancy: props.roomType?.maxOccupancy ?? 2,
  roomCount: props.roomType?.roomCount ?? 1,
  beds: props.roomType?.beds && props.roomType.beds.length > 0
    ? [...props.roomType.beds]
    : [{ size: 'single', count: 1 }],
  pricePerNight: props.roomType?.pricePerNight ?? 0,
  additionalDetails: props.roomType?.additionalDetails ?? '',
});

function addCama() {
  state.value.beds.push({ size: 'single', count: 1 });
}

function removeCama(index: number) {
  if (state.value.beds.length > 1) {
    state.value.beds.splice(index, 1);
  }
}

function onSubmit(event: FormSubmitEvent<z.output<typeof schema>>) {
  const isDuplicate = props.existingTypes.some(
    existingType =>
      existingType.id !== props.roomType?.id
      && areRoomTypesIdentical(
        {
          maxOccupancy: event.data.maxOccupancy,
          roomCount: event.data.roomCount,
          beds: event.data.beds,
          pricePerNight: event.data.pricePerNight,
          additionalDetails: event.data.additionalDetails,
        },
        existingType,
      ),
  );

  if (isDuplicate) {
    toast.add({
      title: 'Error',
      description: 'Ya existe un tipo de habitación con esta configuración',
      color: 'error',
    });
    return;
  }

  emit('submit', event.data);
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="space-y-4"
    @submit="onSubmit"
  >
    <UFormField
      label="Ocupación máxima"
      name="ocupacionMaxima"
      required
    >
      <UInput
        v-model.number="state.maxOccupancy"
        type="number"
        :min="1"
        :max="20"
        placeholder="Número de personas"
      />
    </UFormField>

    <UFormField
      label="Cantidad de habitaciones"
      name="cantidadHabitaciones"
      :hint="`Disponibles: ${availableRooms}`"
      required
    >
      <UInput
        v-model.number="state.roomCount"
        type="number"
        :min="1"
        :max="availableRooms"
        placeholder="Número de habitaciones"
      />
    </UFormField>

    <USeparator label="Configuración de beds" />

    <div class="space-y-2">
      <HotelBedConfigurationInput
        v-for="(cama, i) in state.beds"
        :key="i"
        :model-value="cama"
        @update:model-value="(val) => state.beds[i] = val"
        @remove="removeCama(i)"
      />
      <UButton
        type="button"
        variant="ghost"
        icon="i-lucide-plus"
        size="sm"
        @click="addCama"
      >
        Agregar cama
      </UButton>
    </div>

    <UFormField
      label="Precio por noche"
      name="precioPorNoche"
      required
    >
      <UInput
        v-model.number="state.pricePerNight"
        type="number"
        step="0.01"
        :min="0"
        placeholder="0.00"
      />
    </UFormField>

    <UFormField label="Detalles adicionales" name="detallesAdicionales">
      <UTextarea
        v-model="state.additionalDetails"
        :rows="2"
        placeholder="Vista al mar, balcón, etc."
      />
    </UFormField>

    <div class="flex justify-end gap-3 pt-2">
      <UButton
        type="button"
        variant="ghost"
        @click="emit('cancel')"
      >
        Cancelar
      </UButton>
      <UButton type="submit" color="primary">
        {{ isEditing ? 'Actualizar' : 'Agregar' }}
      </UButton>
    </div>
  </UForm>
</template>
