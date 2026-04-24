<script setup lang="ts">
import type { FormSubmitEvent, SelectItem } from '#ui/types';

import { z } from 'zod';

import type { Coordinator } from '~/types/coordinator';
import type { Travel, TravelFormData } from '~/types/travel';

// Props
type Props = {
  travel?: Travel | null;
};

const { travel = null } = defineProps<Props>();

// Emits
const emit = defineEmits<{
  submit: [data: TravelFormData];
  cancel: [close: boolean];
}>();

const coordinatorStore = useCoordinatorStore();
const allCoordinators = computed(() => coordinatorStore.allCoordinators);
const hasCoordinators = computed(() => allCoordinators.value.length > 0);

const coordinatorItems = computed(() =>
  allCoordinators.value.map((c: Coordinator) => ({
    value: c.id,
    label: `${c.name} — ${c.phone}`,
  })),
);

// Si el viaje tiene cotización activa, el precio es de solo lectura (lo gestiona la cotización)
const cotizacionStore = useCotizacionStore();
const tieneCotizacion = computed(() => travel ? cotizacionStore.hasQuotation(travel.id) : false);

// El precio solo se muestra en modo edición; en creación lo gestiona la cotización
const mostrarPrecio = computed(() => travel !== null);

// Schema de validación Zod
const schema = z.object({
  destination: z.string().min(3, 'Mínimo 3 caracteres').max(100, 'Máximo 100 caracteres'),
  coordinatorIds: z.array(z.string()).min(1, 'Selecciona al menos un coordinador'),
  startDate: z.string().min(1, 'Fecha requerida'),
  endDate: z.string().min(1, 'Fecha requerida'),
  price: z.number().min(0, 'Precio debe ser positivo').max(999999, 'Precio máximo: 999,999'),
  description: z.string().min(10, 'Mínimo 10 caracteres').max(3000, 'Máximo 1000 caracteres'),
  imageUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  status: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']),
  internalNotes: z.string().max(500, 'Máximo 500 caracteres').optional(),
}).refine(
  data => new Date(data.endDate) >= new Date(data.startDate),
  { message: 'Fecha fin debe ser mayor o igual a fecha inicio', path: ['endDate'] },
);

type Schema = z.output<typeof schema>;

// Estado inicial del formulario
const initialState = computed((): Schema => {
  if (travel) {
    return {
      destination: travel.destination,
      coordinatorIds: travel.coordinatorIds ?? [],
      startDate: travel.startDate,
      endDate: travel.endDate,
      price: travel.price,
      description: travel.description,
      imageUrl: travel.imageUrl || '',
      status: travel.status,
      internalNotes: travel.internalNotes || '',
    };
  }

  return {
    destination: '',
    coordinatorIds: [],
    startDate: '',
    endDate: '',
    price: 0,
    description: '',
    imageUrl: '',
    status: 'pending',
    internalNotes: '',
  };
});

const state = ref<Schema>({ ...initialState.value });

// Estado para itinerario y servicios (separados del schema Zod)
const itinerario = ref(travel?.itinerary || []);
const servicios = ref(travel?.services || []);

// Opciones de estado para el select
const estadoOptions: SelectItem[] = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'in_progress', label: 'En Curso' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
];

// Handlers
const isSubmitting = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  isSubmitting.value = true;

  try {
    const formData: TravelFormData = {
      ...event.data,
      itinerary: itinerario.value,
      services: servicios.value,
      buses: travel?.buses ?? [],
    };

    emit('submit', formData);
  }
  finally {
    isSubmitting.value = false;
  }
}

const selectedCoordinators = computed(() =>
  state.value.coordinatorIds
    .map(id => coordinatorStore.getCoordinatorById(id))
    .filter((c): c is Coordinator => c !== undefined),
);

function removeCoordinator(id: string) {
  state.value.coordinatorIds = state.value.coordinatorIds.filter(cid => cid !== id);
}

function onCancel() {
  emit('cancel', true);
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="grid grid-cols-1 xl:grid-cols-2 gap-4"
    @submit="onSubmit"
  >
    <!-- Destino -->
    <!-- Descripción -->
    <section id="datos-generales">
      <UCard>
        <template #header>
          <h2>Datos Generales</h2>
        </template>
        <UFormField
          label="Destino"
          name="destination"
          required
        >
          <UInput
            v-model="state.destination"
            placeholder="París, Francia"
            icon="i-lucide-map-pin"
          />
        </UFormField>

        <!-- Coordinadores -->
        <UFormField
          label="Coordinadores"
          name="coordinatorIds"
          required
        >
          <template v-if="!hasCoordinators">
            <UAlert
              icon="i-lucide-triangle-alert"
              color="warning"
              variant="subtle"
              title="Sin coordinadores registrados"
              description="Debes agregar al menos un coordinador antes de crear un viaje."
            >
              <template #description>
                Debes
                <NuxtLink
                  to="/coordinators"
                  class="font-semibold underline underline-offset-2"
                >
                  agregar coordinadores
                </NuxtLink>
                antes de crear un viaje.
              </template>
            </UAlert>
          </template>
          <template v-else>
            <USelectMenu
              v-model="state.coordinatorIds"
              :items="coordinatorItems"
              multiple
              placeholder="Seleccionar coordinadores"
              value-key="value"
            />
            <div
              v-if="selectedCoordinators.length > 0"
              class="mt-3 flex flex-col gap-2"
            >
              <UCard
                v-for="c in selectedCoordinators"
                :key="c.id"
                :ui="{ body: 'p-3' }"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="flex items-center gap-3 min-w-0">
                    <UAvatar
                      icon="i-lucide-user-star"
                      size="sm"
                      color="violet"
                      variant="soft"
                    />
                    <div class="min-w-0">
                      <p class="font-medium text-sm truncate">
                        {{ c.name }}
                      </p>
                      <div class="flex items-center gap-3 mt-0.5">
                        <UBadge
                          :label="c.phone"
                          icon="i-lucide-phone"
                          color="neutral"
                          variant="subtle"
                          size="sm"
                        />
                        <UBadge
                          :label="c.email"
                          icon="i-lucide-mail"
                          color="neutral"
                          variant="subtle"
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>
                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    icon="i-lucide-x"
                    @click="removeCoordinator(c.id)"
                  />
                </div>
              </UCard>
            </div>
          </template>
        </UFormField>

        <!-- Fechas (Grid 2 columnas) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField
            label="Fecha Inicio"
            name="startDate"
            required
          >
            <UInput
              v-model="state.startDate"
              type="date"
              icon="i-lucide-calendar"
            />
          </UFormField>

          <UFormField
            label="Fecha Fin"
            name="endDate"
            required
          >
            <UInput
              v-model="state.endDate"
              type="date"
              icon="i-lucide-calendar"
            />
          </UFormField>
        </div>

        <!-- Precio y Estado (Grid 2 columnas) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField
            v-if="mostrarPrecio"
            label="Precio (MX)"
            name="price"
            :description="tieneCotizacion ? 'Gestionado por la cotización del viaje' : undefined"
            required
          >
            <UInput
              v-model.number="state.price"
              type="number"
              min="0"
              step="0.01"
              icon="i-lucide-dollar-sign"
              placeholder="0.00"
              :disabled="tieneCotizacion"
            />
          </UFormField>

          <UFormField
            label="Estado"
            name="status"
            required
          >
            <USelect
              v-model="state.status"
              :items="estadoOptions"
              icon="i-lucide-circle-dot"
            />
          </UFormField>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- URL Imagen -->
          <UFormField
            label="URL de Imagen"
            name="imageUrl"
          >
            <UInput
              v-model="state.imageUrl"
              type="url"
              placeholder="https://example.com/image.jpg"
              icon="i-lucide-image"
            />
          </UFormField>
          <!-- Notas Internas -->
          <UFormField
            label="Notas Internas"
            name="internalNotes"
            description="Información privada solo para el equipo"
          >
            <UTextarea
              v-model="state.internalNotes"
              placeholder="Preferencias del cliente, observaciones especiales..."
              :rows="5"
            />
          </UFormField>
        </div>
        <UFormField
          label="Descripción"
          name="description"
          required
        >
          <RichTextEditor
            v-model="state.description"
            placeholder="Describe el viaje, actividades incluidas, etc."
          />
        </UFormField>
      </UCard>
    </section>

    <!-- Itinerario del Viaje -->
    <section id="itinerary">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-list-check" class="w-5 h-5 text-muted" />
            <h2>Itinerario</h2>
          </div>
        </template>
        <TravelActivityList
          v-model="itinerario"
          :start-date="state.startDate"
          :end-date="state.endDate"
        />
      </UCard>
    </section>
    <!-- Botones de acción -->
    <div class="flex col-span-1 xl:col-span-2 items-center justify-center gap-3 pt-4">
      <UButton
        type="button"
        color="neutral"
        variant="outline"
        @click="onCancel"
      >
        Cancelar
      </UButton>
      <UButton
        type="submit"
        color="primary"
        :loading="isSubmitting"
      >
        {{ travel ? 'Actualizar' : 'Crear' }} Viaje
      </UButton>
    </div>
  </UForm>
</template>
