<script setup lang="ts">
import type { TravelAccommodation } from '~/types/travel';

type Props = {
  accommodation: TravelAccommodation;
};

type Emits = {
  submit: [data: { roomNumber?: string | null; floor?: number | null }];
  cancel: [];
};

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const roomNumber = ref<string>(props.accommodation.roomNumber ?? '');
const floor = ref<number | undefined>(props.accommodation.floor ?? undefined);

function onSubmit(): void {
  emit('submit', {
    roomNumber: roomNumber.value.trim() || null,
    floor: floor.value ?? null,
  });
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <UFormField label="Número de habitación" name="roomNumber">
      <UInput
        v-model="roomNumber"
        placeholder="Ej: 101"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Piso" name="floor">
      <UInput
        v-model.number="floor"
        type="number"
        placeholder="Ej: 1"
        class="w-full"
        :min="0"
      />
    </UFormField>

    <div class="flex justify-end gap-2">
      <UButton
        label="Cancelar"
        variant="ghost"
        color="neutral"
        @click="emit('cancel')"
      />
      <UButton
        label="Guardar"
        @click="onSubmit"
      />
    </div>
  </div>
</template>
