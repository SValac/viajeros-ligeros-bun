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
    label: `${c.nombre} — ${c.telefono}`,
  })),
);

// Si el viaje tiene cotización activa, el precio es de solo lectura (lo gestiona la cotización)
const cotizacionStore = useCotizacionStore();
const tieneCotizacion = computed(() => travel ? cotizacionStore.hasCotizacion(travel.id) : false);

// El precio solo se muestra en modo edición; en creación lo gestiona la cotización
const mostrarPrecio = computed(() => travel !== null);

// Schema de validación Zod
const schema = z.object({
  destino: z.string().min(3, 'Mínimo 3 caracteres').max(100, 'Máximo 100 caracteres'),
  coordinadorIds: z.array(z.string()).min(1, 'Selecciona al menos un coordinador'),
  fechaInicio: z.string().min(1, 'Fecha requerida'),
  fechaFin: z.string().min(1, 'Fecha requerida'),
  precio: z.number().min(0, 'Precio debe ser positivo').max(999999, 'Precio máximo: 999,999'),
  descripcion: z.string().min(10, 'Mínimo 10 caracteres').max(3000, 'Máximo 1000 caracteres'),
  imagenUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  estado: z.enum(['pendiente', 'confirmado', 'en-curso', 'completado', 'cancelado']),
  notasInternas: z.string().max(500, 'Máximo 500 caracteres').optional(),
}).refine(
  data => new Date(data.fechaFin) >= new Date(data.fechaInicio),
  { message: 'Fecha fin debe ser mayor o igual a fecha inicio', path: ['fechaFin'] },
);

type Schema = z.output<typeof schema>;

// Estado inicial del formulario
const initialState = computed((): Schema => {
  if (travel) {
    return {
      destino: travel.destino,
      coordinadorIds: travel.coordinadorIds ?? [],
      fechaInicio: travel.fechaInicio,
      fechaFin: travel.fechaFin,
      precio: travel.precio,
      descripcion: travel.descripcion,
      imagenUrl: travel.imagenUrl || '',
      estado: travel.estado,
      notasInternas: travel.notasInternas || '',
    };
  }

  return {
    destino: '',
    coordinadorIds: [],
    fechaInicio: '',
    fechaFin: '',
    precio: 0,
    descripcion: '',
    imagenUrl: '',
    estado: 'pendiente',
    notasInternas: '',
  };
});

const state = ref<Schema>({ ...initialState.value });

// Estado para itinerario y servicios (separados del schema Zod)
const itinerario = ref(travel?.itinerario || []);
const servicios = ref(travel?.servicios || []);

// Opciones de estado para el select
const estadoOptions: SelectItem[] = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'en-curso', label: 'En Curso' },
  { value: 'completado', label: 'Completado' },
  { value: 'cancelado', label: 'Cancelado' },
];

// Handlers
const isSubmitting = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  isSubmitting.value = true;

  try {
    const formData: TravelFormData = {
      ...event.data,
      itinerario: itinerario.value,
      servicios: servicios.value,
      autobuses: travel?.autobuses ?? [],
    };

    emit('submit', formData);
  }
  finally {
    isSubmitting.value = false;
  }
}

const selectedCoordinators = computed(() =>
  state.value.coordinadorIds
    .map(id => coordinatorStore.getCoordinatorById(id))
    .filter((c): c is Coordinator => c !== undefined),
);

function removeCoordinator(id: string) {
  state.value.coordinadorIds = state.value.coordinadorIds.filter(cid => cid !== id);
}

function onCancel() {
  emit('cancel', true);
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="space-y-4"
    @submit="onSubmit"
  >
    <!-- Destino -->
    <UFormField
      label="Destino"
      name="destino"
      required
    >
      <UInput
        v-model="state.destino"
        placeholder="París, Francia"
        icon="i-lucide-map-pin"
      />
    </UFormField>

    <!-- Coordinadores -->
    <UFormField
      label="Coordinadores"
      name="coordinadorIds"
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
          v-model="state.coordinadorIds"
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
                    {{ c.nombre }}
                  </p>
                  <div class="flex items-center gap-3 mt-0.5">
                    <UBadge
                      :label="c.telefono"
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
        name="fechaInicio"
        required
      >
        <UInput
          v-model="state.fechaInicio"
          type="date"
          icon="i-lucide-calendar"
        />
      </UFormField>

      <UFormField
        label="Fecha Fin"
        name="fechaFin"
        required
      >
        <UInput
          v-model="state.fechaFin"
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
        name="precio"
        :description="tieneCotizacion ? 'Gestionado por la cotización del viaje' : undefined"
        required
      >
        <UInput
          v-model.number="state.precio"
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
        name="estado"
        required
      >
        <USelect
          v-model="state.estado"
          :items="estadoOptions"
          icon="i-lucide-circle-dot"
        />
      </UFormField>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- URL Imagen -->
      <UFormField
        label="URL de Imagen"
        name="imagenUrl"
      >
        <UInput
          v-model="state.imagenUrl"
          type="url"
          placeholder="https://example.com/image.jpg"
          icon="i-lucide-image"
        />
      </UFormField>
      <!-- Notas Internas -->
      <UFormField
        label="Notas Internas"
        name="notasInternas"
        description="Información privada solo para el equipo"
      >
        <UTextarea
          v-model="state.notasInternas"
          placeholder="Preferencias del cliente, observaciones especiales..."
          :rows="5"
        />
      </UFormField>
    </div>

    <!-- Descripción -->
    <UFormField
      label="Descripción"
      name="descripcion"
      required
    >
      <RichTextEditor
        v-model="state.descripcion"
        placeholder="Describe el viaje, actividades incluidas, etc."
      />
    </UFormField>
    <!-- Itinerario del Viaje -->
    <USeparator label="Itinerario del Viaje" />
    <TravelActivityList
      v-model="itinerario"
      :fecha-inicio="state.fechaInicio"
      :fecha-fin="state.fechaFin"
    />

    <!-- Botones de acción -->
    <div class="flex justify-end gap-3 pt-4">
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
