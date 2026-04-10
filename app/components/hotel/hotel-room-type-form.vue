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
  ocupacionMaxima: z.number().int().min(1, 'Mínimo 1 persona').max(20, 'Máximo 20 personas'),
  cantidadHabitaciones: z.number().int().min(1, 'Mínimo 1 habitación'),
  camas: z.array(
    z.object({
      tamaño: z.enum(['individual', 'matrimonial', 'queen', 'king']),
      cantidad: z.number().int().min(1).max(10),
    }),
  ).min(1, 'Agrega al menos una cama'),
  precioPorNoche: z.number().positive('El precio debe ser mayor a 0'),
  detallesAdicionales: z.string().optional().or(z.literal('')),
});

const isEditing = computed(() => !!props.roomType);
const editingRooms = computed(() => props.roomType?.cantidadHabitaciones ?? 0);
const availableRooms = computed(() => props.maxRooms - props.usedRooms + editingRooms.value);

const state = ref<HotelRoomTypeFormData>({
  ocupacionMaxima: props.roomType?.ocupacionMaxima ?? 2,
  cantidadHabitaciones: props.roomType?.cantidadHabitaciones ?? 1,
  camas: props.roomType?.camas && props.roomType.camas.length > 0
    ? [...props.roomType.camas]
    : [{ tamaño: 'individual', cantidad: 1 }],
  precioPorNoche: props.roomType?.precioPorNoche ?? 0,
  detallesAdicionales: props.roomType?.detallesAdicionales ?? '',
});

function addCama() {
  state.value.camas.push({ tamaño: 'individual', cantidad: 1 });
}

function removeCama(index: number) {
  if (state.value.camas.length > 1) {
    state.value.camas.splice(index, 1);
  }
}

function onSubmit(event: FormSubmitEvent<z.output<typeof schema>>) {
  const isDuplicate = props.existingTypes.some(
    existingType =>
      existingType.id !== props.roomType?.id
      && areRoomTypesIdentical(
        {
          ocupacionMaxima: event.data.ocupacionMaxima,
          cantidadHabitaciones: event.data.cantidadHabitaciones,
          camas: event.data.camas,
          precioPorNoche: event.data.precioPorNoche,
          detallesAdicionales: event.data.detallesAdicionales,
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
        v-model.number="state.ocupacionMaxima"
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
        v-model.number="state.cantidadHabitaciones"
        type="number"
        :min="1"
        :max="availableRooms"
        placeholder="Número de habitaciones"
      />
    </UFormField>

    <USeparator label="Configuración de camas" />

    <div class="space-y-2">
      <HotelBedConfigurationInput
        v-for="(cama, i) in state.camas"
        :key="i"
        :model-value="cama"
        @update:model-value="(val) => state.camas[i] = val"
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
        v-model.number="state.precioPorNoche"
        type="number"
        step="0.01"
        :min="0"
        placeholder="0.00"
      />
    </UFormField>

    <UFormField label="Detalles adicionales" name="detallesAdicionales">
      <UTextarea
        v-model="state.detallesAdicionales"
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
