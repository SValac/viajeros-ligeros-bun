<script setup lang="ts">
import { z } from 'zod';

import type { CotizacionHospedajeDetalleFormData, CotizacionHospedajeFormData } from '~/types/cotizacion';
import type { HotelRoomType } from '~/types/hotel-room';

type Props = {
  cotizacionId: string;
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
    cotizacionStore.getHospedajesByCotizacion(props.cotizacionId).map(h => h.providerId),
  );
});

// Hoteles disponibles (providers con categoría 'hospedaje', activos y no duplicados)
const hotelesDisponibles = computed(() => {
  return providerStore.getProvidersByCategory('hospedaje')
    .filter(p => p.activo && !hotelsYaAgregados.value.has(p.id));
});

const hotelesSelectItems = computed(() =>
  hotelesDisponibles.value.map(p => ({ value: p.id, label: p.nombre })),
);

// Esquema de validación
const formSchema = z.object({
  cotizacionId: z.string(),
  providerId: z.string({ message: 'Selecciona un hotel' }),
  cantidadNoches: z.number({ message: 'Ingresa la cantidad de noches' })
    .int()
    .positive('Debe ser mayor a 0'),
  detalles: z.array(z.object({
    habitacionTipoId: z.string(),
    cantidad: z.number().int().positive('Debe ser mayor a 0'),
    precioPorNoche: z.number().positive(),
    ocupacionMaxima: z.number().int().positive(),
  })).min(1, 'Selecciona al menos un tipo de habitación'),
});

type FormSchema = z.infer<typeof formSchema>;

const formState = reactive<Partial<FormSchema>>({
  cotizacionId: props.cotizacionId,
  providerId: '',
  cantidadNoches: 1,
  detalles: [],
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

// Mapa de qué tipos están seleccionados
const detallesMap = computed(() => {
  const map = new Map<string, CotizacionHospedajeDetalleFormData>();
  for (const detalle of formState.detalles ?? []) {
    map.set(detalle.habitacionTipoId, detalle);
  }
  return map;
});

// Al cambiar de hotel, reiniciar detalles
watch(() => formState.providerId, () => {
  formState.detalles = [];
});

// Toggle selección de tipo de habitación
function toggleTipoHabitacion(tipo: HotelRoomType) {
  if (!formState.detalles)
    formState.detalles = [];

  const existe = detallesMap.value.has(tipo.id);
  if (existe) {
    formState.detalles = formState.detalles.filter(d => d.habitacionTipoId !== tipo.id);
  }
  else {
    formState.detalles.push({
      habitacionTipoId: tipo.id,
      cantidad: 1,
      precioPorNoche: tipo.precioPorNoche,
      ocupacionMaxima: tipo.ocupacionMaxima,
    });
  }
}

// Actualizar cantidad de habitaciones
function actualizarCantidad(tipoId: string, cantidad: number) {
  const detalle = formState.detalles?.find(d => d.habitacionTipoId === tipoId);
  if (!detalle || cantidad <= 0)
    return;
  const tipo = tiposHabitacionSeleccionado.value.find(t => t.id === tipoId);
  detalle.cantidad = tipo ? Math.min(cantidad, tipo.cantidadHabitaciones) : cantidad;
}

// Calcular costo por persona
function calcularCostoPorPersona(detalle: CotizacionHospedajeDetalleFormData): number {
  return detalle.precioPorNoche / detalle.ocupacionMaxima;
}

// Calcular costo total (por noche * noches * cantidad)
function calcularCostoTotal(detalle: CotizacionHospedajeDetalleFormData): number {
  return (detalle.precioPorNoche * (formState.cantidadNoches ?? 1)) * detalle.cantidad;
}

// Calcular costo total de todas las habitaciones
const costoTotalHospedaje = computed(() => {
  return (formState.detalles ?? []).reduce((sum, detalle) => {
    return sum + calcularCostoTotal(detalle);
  }, 0);
});

function handleSubmit() {
  const result = formSchema.safeParse(formState);
  if (!result.success) {
    toast.add({
      title: 'Error en el formulario',
      description: result.error.issues.map((e: any) => e.message).join(', '),
      color: 'error',
    });
    return;
  }

  const response = cotizacionStore.addHospedajeCotizacion(result.data as CotizacionHospedajeFormData);
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
    color: 'success',
  });

  // Reiniciar form
  formState.cotizacionId = props.cotizacionId;
  formState.providerId = '';
  formState.cantidadNoches = 1;
  formState.detalles = [];

  emit('hospedajeAgregado');
  emit('update:open', false);
}

function handleCancel() {
  formState.cotizacionId = props.cotizacionId;
  formState.providerId = '';
  formState.cantidadNoches = 1;
  formState.detalles = [];
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
            v-model.number="formState.cantidadNoches"
            type="number"
            min="1"
            placeholder="Ej. 3"
          />
        </UFormField>

        <!-- Tipos de Habitación -->
        <div v-if="formState.providerId" class="space-y-4">
          <h3 class="font-semibold flex items-center gap-2">
            <span class="i-lucide-door-open w-4 h-4" />
            Tipos de Habitación
          </h3>

          <div v-if="tiposHabitacionSeleccionado.length === 0" class="text-center py-6 text-muted">
            <p>Este hotel no tiene tipos de habitación configurados</p>
          </div>

          <div v-else class="space-y-3 max-h-80 overflow-y-auto border rounded-lg p-4">
            <div
              v-for="tipo in tiposHabitacionSeleccionado"
              :key="tipo.id"
              class="border rounded-lg p-4 space-y-3"
            >
              <!-- Checkbox para seleccionar tipo -->
              <div class="flex items-start gap-3">
                <UCheckbox
                  :model-value="detallesMap.has(tipo.id)"
                  @update:model-value="() => toggleTipoHabitacion(tipo)"
                />
                <div class="flex-1">
                  <p class="font-medium">
                    {{ tipo.ocupacionMaxima }} personas - ${{ tipo.precioPorNoche.toFixed(2) }}/noche
                  </p>
                  <p class="text-xs text-muted">
                    Cama(s): {{ tipo.camas.map((c: any) => `${c.cantidad} ${c.tamaño}`).join(', ') }}
                  </p>
                </div>
              </div>

              <!-- Detalles del tipo si está seleccionado -->
              <div v-if="detallesMap.has(tipo.id)" class="ml-8 space-y-2 border-l-2 border-primary pl-4">
                <div class="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <label class="text-xs text-muted">Cantidad de Habitaciones (máx. {{ tipo.cantidadHabitaciones }})</label>
                    <UInput
                      :model-value="detallesMap.get(tipo.id)?.cantidad ?? 1"
                      type="number"
                      min="1"
                      :max="tipo.cantidadHabitaciones"
                      size="sm"
                      @update:model-value="(v) => actualizarCantidad(tipo.id, v)"
                    />
                  </div>
                  <div>
                    <label class="text-xs text-muted">Costo por Persona</label>
                    <div class="text-sm font-medium py-2">
                      ${{ calcularCostoPorPersona(detallesMap.get(tipo.id)!).toFixed(2) }}
                    </div>
                  </div>
                </div>

                <!-- Desglose: costo total por tipo -->
                <div class="text-xs bg-muted/20 rounded px-2 py-1">
                  <p>
                    {{ tipo.precioPorNoche.toFixed(2) }} × {{ formState.cantidadNoches }} noches × {{ detallesMap.get(tipo.id)?.cantidad ?? 1 }} hab = <span class="font-medium">${{ calcularCostoTotal(detallesMap.get(tipo.id)!).toFixed(2) }}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Resumen de costos -->
        <div v-if="(formState.detalles?.length ?? 0) > 0" class="bg-primary/10 rounded-lg p-4">
          <div class="flex justify-between items-center">
            <span class="font-semibold">Costo Total del Hospedaje</span>
            <span class="text-lg font-bold">${{ costoTotalHospedaje.toFixed(2) }}</span>
          </div>
        </div>

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
