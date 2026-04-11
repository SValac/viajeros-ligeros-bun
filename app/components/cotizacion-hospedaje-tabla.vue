<script setup lang="ts">
import { z } from 'zod';

import type { CotizacionHospedaje, CotizacionHospedajeFormData } from '~/types/cotizacion';

type Props = {
  cotizacionId: string;
  readonly?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
});

const cotizacionStore = useCotizacionStore();
const providerStore = useProviderStore();
const toast = useToast();

// Hospedajes de la cotización
const hospedajes = computed(() => {
  return cotizacionStore.getHospedajesByCotizacion(props.cotizacionId);
});

// Modal estado
const isEditModalOpen = ref(false);
const editingHospedaje = ref<CotizacionHospedaje | null>(null);

// Schema para editar
const editSchema = z.object({
  cantidadNoches: z.number().int().positive(),
  detalles: z.array(z.object({
    habitacionTipoId: z.string(),
    cantidad: z.number().int().positive(),
    precioPorNoche: z.number().positive(),
    ocupacionMaxima: z.number().int().positive(),
  })).min(1),
});

// Estado del form de edición
const editFormState = reactive({
  cantidadNoches: 0,
  detalles: [] as any[],
});

// Obtener nombre del hotel
function getNombreHotel(providerId: string): string {
  return providerStore.getProviderById(providerId)?.nombre ?? 'Desconocido';
}

// Obtener desglose de habitaciones como string
function getDesgloseHabitaciones(hospedaje: CotizacionHospedaje): string {
  return hospedaje.detalles
    .map(d => `${d.cantidad} hab (${d.ocupacionMaxima} pax)`)
    .join(' + ');
}

// Abrir modal de edición
function abrirEdicion(hospedaje: CotizacionHospedaje) {
  editingHospedaje.value = hospedaje;
  editFormState.cantidadNoches = hospedaje.cantidadNoches;
  editFormState.detalles = hospedaje.detalles.map(d => ({ ...d }));
  isEditModalOpen.value = true;
}

// Guardar edición
function guardarEdicion() {
  if (!editingHospedaje.value)
    return;

  const result = editSchema.safeParse(editFormState);
  if (!result.success) {
    toast.add({
      title: 'Error en la edición',
      description: result.error.issues.map((e: any) => e.message).join(', '),
      color: 'error',
    });
    return;
  }

  const updated = cotizacionStore.updateHospedajeCotizacion(editingHospedaje.value.id, {
    cantidadNoches: editFormState.cantidadNoches,
    detalles: editFormState.detalles,
    costoTotal: editFormState.detalles.reduce((sum, d) => {
      return sum + (d.precioPorNoche * editFormState.cantidadNoches * d.cantidad);
    }, 0),
  } as Partial<CotizacionHospedajeFormData>);

  if (!updated) {
    toast.add({
      title: 'Error',
      description: 'No se pudo actualizar el hospedaje',
      color: 'error',
    });
    return;
  }

  toast.add({
    title: 'Hospedaje actualizado',
    color: 'success',
  });

  isEditModalOpen.value = false;
  editingHospedaje.value = null;
}

// Eliminar hospedaje
function eliminarHospedaje(id: string) {
  cotizacionStore.deleteHospedajeCotizacion(id);
  toast.add({
    title: 'Hospedaje eliminado',
    color: 'success',
  });
}
</script>

<template>
  <div class="space-y-4">
    <!-- Tabla de hospedajes -->
    <div v-if="hospedajes.length > 0" class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-muted/30 border-b">
          <tr>
            <th class="px-4 py-3 text-left font-semibold">
              Hotel
            </th>
            <th class="px-4 py-3 text-left font-semibold">
              Noches
            </th>
            <th class="px-4 py-3 text-left font-semibold">
              Habitaciones
            </th>
            <th class="px-4 py-3 text-right font-semibold">
              Costo Total
            </th>
            <th v-if="!readonly" class="px-4 py-3 text-center font-semibold">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr
            v-for="hospedaje in hospedajes"
            :key="hospedaje.id"
            class="hover:bg-muted/10 transition-colors"
          >
            <!-- Hotel -->
            <td class="px-4 py-3">
              <div>
                <p class="font-medium">
                  {{ getNombreHotel(hospedaje.providerId) }}
                </p>
              </div>
            </td>

            <!-- Noches -->
            <td class="px-4 py-3">
              <span class="font-medium">{{ hospedaje.cantidadNoches }}</span>
            </td>

            <!-- Habitaciones desglose -->
            <td class="px-4 py-3">
              <p class="text-xs text-muted">
                {{ getDesgloseHabitaciones(hospedaje) }}
              </p>
            </td>

            <!-- Costo Total -->
            <td class="px-4 py-3 text-right">
              <span class="font-bold text-primary">
                ${{ hospedaje.costoTotal.toFixed(2) }}
              </span>
            </td>

            <!-- Acciones -->
            <td v-if="!readonly" class="px-4 py-3 text-center">
              <div class="flex justify-center gap-2">
                <UButton
                  icon="i-lucide-pencil"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  @click="abrirEdicion(hospedaje)"
                />
                <UButton
                  icon="i-lucide-trash-2"
                  size="xs"
                  variant="ghost"
                  color="error"
                  @click="eliminarHospedaje(hospedaje.id)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Sin hospedajes -->
    <div v-else class="text-center py-8 text-muted">
      <span class="i-lucide-inbox w-8 h-8 mx-auto mb-2 block opacity-50" />
      <p class="text-sm">
        No hay hospedajes agregados
      </p>
    </div>

    <!-- Modal de edición -->
    <UModal
      v-model:open="isEditModalOpen"
      title="Editar Hospedaje"
      description="Actualiza los detalles del hospedaje"
      class="sm:max-w-2xl"
    >
      <template #body>
        <div v-if="editingHospedaje" class="space-y-6">
          <!-- Mostrar hotel (read-only) -->
          <div>
            <label class="text-sm font-medium block mb-2">Hotel</label>
            <div class="bg-muted/20 rounded px-4 py-2">
              {{ getNombreHotel(editingHospedaje.providerId) }}
            </div>
          </div>

          <!-- Cantidad de noches editable -->
          <div>
            <label class="text-sm font-medium block mb-2">Cantidad de Noches</label>
            <UInput
              v-model.number="editFormState.cantidadNoches"
              type="number"
              min="1"
              placeholder="Ej. 3"
            />
          </div>

          <!-- Detalles de habitaciones editable -->
          <div class="space-y-3">
            <h4 class="text-sm font-semibold">
              Tipos de Habitación
            </h4>
            <div class="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-4">
              <div
                v-for="(detalle, idx) in editFormState.detalles"
                :key="`${detalle.habitacionTipoId}-${idx}`"
                class="border rounded p-3 space-y-2"
              >
                <div class="flex justify-between items-start">
                  <div>
                    <p class="font-medium">
                      {{ detalle.ocupacionMaxima }} personas
                    </p>
                    <p class="text-xs text-muted">
                      ${{ detalle.precioPorNoche.toFixed(2) }}/noche
                    </p>
                  </div>
                  <UButton
                    icon="i-lucide-x"
                    size="xs"
                    variant="ghost"
                    color="error"
                    @click="editFormState.detalles.splice(idx, 1)"
                  />
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-xs text-muted block mb-1">Cantidad de Habitaciones</label>
                    <UInput
                      v-model.number="detalle.cantidad"
                      type="number"
                      min="1"
                      size="sm"
                    />
                  </div>
                  <div>
                    <label class="text-xs text-muted block mb-1">Costo/Persona</label>
                    <div class="text-sm font-medium py-2">
                      ${{ (detalle.precioPorNoche / detalle.ocupacionMaxima).toFixed(2) }}
                    </div>
                  </div>
                </div>

                <div class="text-xs bg-muted/20 rounded px-2 py-1">
                  <p>
                    ${{ detalle.precioPorNoche.toFixed(2) }} × {{ editFormState.cantidadNoches }} × {{ detalle.cantidad }} = <span class="font-semibold">${{ (detalle.precioPorNoche * editFormState.cantidadNoches * detalle.cantidad).toFixed(2) }}</span>
                  </p>
                </div>
              </div>
            </div>

            <div v-if="editFormState.detalles.length === 0" class="text-center py-4 text-muted text-sm">
              No hay tipos de habitación
            </div>
          </div>

          <!-- Costo total -->
          <div class="bg-primary/10 rounded-lg p-4 border border-primary/20">
            <div class="flex justify-between items-center">
              <span class="font-semibold">Costo Total</span>
              <span class="text-lg font-bold">
                ${{ editFormState.detalles.reduce((sum, d) => sum + (d.precioPorNoche * editFormState.cantidadNoches * d.cantidad), 0).toFixed(2) }}
              </span>
            </div>
          </div>

          <!-- Acciones -->
          <div class="flex justify-end gap-3 pt-2">
            <UButton
              variant="ghost"
              color="neutral"
              label="Cancelar"
              @click="isEditModalOpen = false"
            />
            <UButton
              label="Guardar"
              @click="guardarEdicion"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
