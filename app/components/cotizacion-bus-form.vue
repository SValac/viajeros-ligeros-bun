<script setup lang="ts">
import { z } from 'zod';

import type { Bus } from '~/types/bus';
import type { CotizacionBusEstado } from '~/types/cotizacion';

type Props = {
  cotizacionId: string;
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
  providerStore.getProvidersByCategory('agencias-autobus').filter(p => p.activo),
);

const agenciasSelectItems = computed(() =>
  agenciasDisponibles.value.map(p => ({ value: p.id, label: p.nombre })),
);

const estadoOptions = [
  { label: 'Apartado', value: 'apartado' },
  { label: 'Confirmado', value: 'confirmado' },
  { label: 'Pendiente', value: 'pendiente' },
];

const busSchema = z.object({
  proveedorId: z.string({ message: 'Selecciona una agencia' }).min(1, 'Selecciona una agencia'),
  numeroUnidad: z.string({ message: 'Número de unidad es requerido' }).min(1, 'Número de unidad es requerido').max(50),
  capacidad: z.number({ message: 'Ingresa la capacidad' }).int().positive('Debe ser mayor a 0'),
  estado: z.enum(['apartado', 'confirmado', 'pendiente']),
  notas: z.string().max(500).optional(),
});

type BusSchema = z.infer<typeof busSchema>;

const formState = reactive<Partial<BusSchema>>({
  proveedorId: '',
  numeroUnidad: '',
  capacidad: undefined,
  estado: 'apartado' as CotizacionBusEstado,
  notas: '',
});

const busSeleccionado = ref<Bus | null>(null);

// Unidades del catálogo para la agencia seleccionada
const unidadesAgencia = computed<Bus[]>(() => {
  if (!formState.proveedorId)
    return [];
  return busStore.getBusesByProvider(formState.proveedorId);
});

// Al cambiar agencia, limpiar selección de unidad
watch(() => formState.proveedorId, () => {
  busSeleccionado.value = null;
  formState.numeroUnidad = '';
  formState.capacidad = undefined;
});

function seleccionarUnidad(bus: Bus) {
  busSeleccionado.value = bus;
  // Construir numeroUnidad a partir del catálogo
  const partes = [bus.marca, bus.modelo, bus.año ? `(${bus.año})` : null].filter(Boolean);
  formState.numeroUnidad = partes.length > 0 ? partes.join(' ') : `Unidad ${bus.id.slice(-6)}`;
  formState.capacidad = bus.cantidadAsientos;
}

function deseleccionarUnidad() {
  busSeleccionado.value = null;
  formState.numeroUnidad = '';
  formState.capacidad = undefined;
}

function getBusLabel(bus: Bus): string {
  const partes = [bus.marca, bus.modelo, bus.año ? `(${bus.año})` : null].filter(Boolean);
  return partes.length > 0 ? partes.join(' ') : 'Sin identificación';
}

function resetForm() {
  formState.proveedorId = '';
  formState.numeroUnidad = '';
  formState.capacidad = undefined;
  formState.estado = 'apartado';
  formState.notas = '';
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

  const response = cotizacionStore.addBusCotizacion({
    cotizacionId: props.cotizacionId,
    ...result.data,
    notas: result.data.notas || undefined,
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
            v-model="formState.proveedorId"
            :items="agenciasSelectItems"
            placeholder="Selecciona una agencia"
          />
        </UFormField>

        <!-- Unidades de la agencia -->
        <template v-if="formState.proveedorId">
          <div class="space-y-3">
            <label class="text-sm font-medium">Unidad <span class="text-error">*</span></label>

            <!-- Sin unidades registradas -->
            <UAlert
              v-if="unidadesAgencia.length === 0"
              icon="i-lucide-bus-front"
              color="warning"
              variant="subtle"
              title="Esta agencia no tiene unidades registradas"
              description="Agrega las unidades desde el perfil de la agencia antes de continuar."
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
                  :to="`/providers/bus-agencies/${formState.proveedorId}`"
                  target="_blank"
                />
              </template>
            </UAlert>

            <!-- Lista de unidades -->
            <template v-else>
              <!-- Unidad seleccionada -->
              <div
                v-if="busSeleccionado"
                class="border border-primary rounded-lg p-4 bg-primary/5 space-y-2"
              >
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <p class="font-medium">
                      {{ getBusLabel(busSeleccionado) }}
                    </p>
                    <p class="text-sm text-muted">
                      {{ busSeleccionado.cantidadAsientos }} asientos
                      <template v-if="busSeleccionado.precioRenta">
                        · ${{ busSeleccionado.precioRenta.toLocaleString('es-MX') }} renta ref.
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
                      {{ bus.cantidadAsientos }} asientos
                      <template v-if="bus.precioRenta">
                        · ${{ bus.precioRenta.toLocaleString('es-MX') }}
                      </template>
                    </p>
                  </div>
                  <span class="i-lucide-chevron-right w-4 h-4 text-muted" />
                </button>
              </div>
            </template>
          </div>
        </template>

        <!-- Campos adicionales (visibles solo cuando hay unidad seleccionada) -->
        <template v-if="busSeleccionado">
          <!-- Número de unidad (editable) -->
          <UFormField label="Identificador de la Unidad" required>
            <UInput
              v-model="formState.numeroUnidad"
              placeholder="Ej. BUS-001 o Marca Modelo"
            />
          </UFormField>

          <!-- Capacidad (editable, pre-llenada) -->
          <UFormField label="Capacidad (asientos)" required>
            <UInput
              v-model.number="formState.capacidad"
              type="number"
              min="1"
            />
          </UFormField>

          <!-- Estado -->
          <UFormField label="Estado">
            <USelect
              v-model="formState.estado"
              :items="estadoOptions"
            />
          </UFormField>

          <!-- Notas -->
          <UFormField label="Notas">
            <UTextarea
              v-model="formState.notas"
              placeholder="Observaciones sobre este autobús..."
              :rows="2"
            />
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
