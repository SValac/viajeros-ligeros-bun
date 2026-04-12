<script setup lang="ts">
import { formatBedConfiguration } from '~/utils/hotel-room-helpers';

type Props = {
  cotizacionId: string;
};

const props = defineProps<Props>();

const cotizacionStore = useCotizacionStore();
const providerStore = useProviderStore();
const hotelRoomStore = useHotelRoomStore();

const hospedajes = computed(() => cotizacionStore.getHospedajesByCotizacion(props.cotizacionId));

const totalCosto = computed(() => cotizacionStore.getTotalCostoHospedajes(props.cotizacionId));

function getNombreHotel(providerId: string): string {
  return providerStore.getProviderById(providerId)?.nombre ?? 'Desconocido';
}

// Para cada hospedaje, obtener el tipo de habitación del store
function getTipoInfo(providerId: string, habitacionTipoId: string) {
  const roomData = hotelRoomStore.getRoomDataByProviderId(providerId);
  return roomData?.roomTypes.find(t => t.id === habitacionTipoId) ?? null;
}

// Items del accordion — uno por hospedaje
function getDesgloseHabitaciones(hospedaje: typeof hospedajes.value[number]): string {
  return hospedaje.detalles
    .map(d => `${d.cantidad} hab (${d.ocupacionMaxima} p)`)
    .join(' · ');
}

const accordionItems = computed(() =>
  hospedajes.value.map(h => ({
    label: `${getNombreHotel(h.providerId)} - ${getDesgloseHabitaciones(h)}`,
    value: h.id,
    slot: `hotel-${h.id}`,
  })),
);

// Por default todos abiertos
const defaultValue = computed(() => hospedajes.value.map(h => h.id));

const costoPromedioPorPersona = computed(() => {
  let totalPersonas = 0;
  for (const h of hospedajes.value) {
    for (const d of h.detalles) {
      totalPersonas += d.cantidad * d.ocupacionMaxima;
    }
  }
  return totalPersonas > 0 ? totalCosto.value / totalPersonas : 0;
});
</script>

<template>
  <div v-if="hospedajes.length > 0" class="space-y-4">
    <!-- Resumen General -->
    <div class="bg-linear-to-br from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <p class="text-xs text-muted mb-1">
            Hoteles
          </p>
          <p class="text-2xl font-bold">
            {{ hospedajes.length }}
          </p>
        </div>
        <div>
          <p class="text-xs text-muted mb-1">
            Habitaciones Totales
          </p>
          <p class="text-2xl font-bold">
            {{ hospedajes.reduce((s, h) => s + h.detalles.reduce((ss, d) => ss + d.cantidad, 0), 0) }}
          </p>
        </div>
        <div>
          <p class="text-xs text-muted mb-1">
            Costo Total
          </p>
          <p class="text-2xl font-bold text-primary">
            ${{ totalCosto.toFixed(2) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Desglose por Hotel (Accordion) -->
    <div>
      <h4 class="text-sm font-semibold flex items-center gap-2 mb-2">
        <span class="i-lucide-building w-4 h-4" />
        Desglose por Hotel
      </h4>

      <UAccordion
        :items="accordionItems"
        :default-value="defaultValue"
        type="multiple"
        collapsible
        class=""
      >
        <template
          v-for="hospedaje in hospedajes"
          :key="hospedaje.id"
          #[`hotel-${hospedaje.id}`]
        >
          <!-- Tabla de tipos de habitación -->
          <div class="border rounded-lg overflow-hidden text-sm">
            <div class="bg-muted/30 px-4 py-2 grid grid-cols-4 gap-2 text-xs font-medium border-b">
              <div>Tipo</div>
              <div class="text-right">
                Habitaciones
              </div>
              <div class="text-right">
                Precio/noche
              </div>
              <div class="text-right">
                Subtotal
              </div>
            </div>
            <div
              v-for="detalle in hospedaje.detalles"
              :key="detalle.id"
              class="px-4 py-3 border-b last:border-b-0 grid grid-cols-4 gap-2"
            >
              <div>
                <p class="font-medium">
                  {{ formatBedConfiguration(getTipoInfo(hospedaje.providerId, detalle.habitacionTipoId)?.camas ?? []) || '—' }}
                </p>
                <p class="text-xs text-muted">
                  {{ detalle.ocupacionMaxima }} {{ detalle.ocupacionMaxima === 1 ? 'persona' : 'personas' }}
                </p>
              </div>
              <div class="text-right">
                {{ detalle.cantidad }} hab
              </div>
              <div class="text-right">
                ${{ detalle.precioPorNoche.toFixed(2) }}
              </div>
              <div class="text-right font-semibold">
                ${{ (detalle.precioPorNoche * hospedaje.cantidadNoches * detalle.cantidad).toFixed(2) }}
              </div>
            </div>
            <!-- Total del hotel -->
            <div class="px-4 py-2 bg-muted/10 flex justify-between items-center text-sm font-semibold border-t">
              <span>Total ({{ hospedaje.cantidadNoches }} noche{{ hospedaje.cantidadNoches !== 1 ? 's' : '' }})</span>
              <span class="text-primary">${{ hospedaje.costoTotal.toFixed(2) }}</span>
            </div>
          </div>
        </template>
      </UAccordion>
    </div>

    <!-- Costo Promedio -->
    <div class="bg-secondary/10 rounded-lg p-3 text-sm border border-secondary/20">
      <div class="flex justify-between items-center">
        <span class="text-muted">Costo Promedio por Persona (hospedaje)</span>
        <span class="font-semibold">${{ costoPromedioPorPersona.toFixed(2) }}</span>
      </div>
    </div>
  </div>

  <!-- Sin hospedajes -->
  <div v-else class="text-center py-8 text-muted">
    <span class="i-lucide-inbox w-8 h-8 mx-auto mb-2 block opacity-50" />
    <p class="text-sm">
      No hay hospedajes agregados aún
    </p>
  </div>
</template>
