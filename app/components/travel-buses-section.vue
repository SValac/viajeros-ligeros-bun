<script setup lang="ts">
type Props = {
  travelId: string;
  editable?: boolean;
};

const { travelId, editable = false } = defineProps<Props>();

const router = useRouter();
const cotizacionStore = useCotizacionStore();
const providerStore = useProviderStore();
const coordinatorStore = useCoordinatorStore();

const travelsStore = useTravelsStore();

const travel = computed(() => travelsStore.getTravelById(travelId));
const cotizacion = computed(() => cotizacionStore.getCotizacionByTravel(travelId));
const buses = computed(() => {
  if (!cotizacion.value)
    return [];
  return cotizacionStore.getBusesByCotizacion(cotizacion.value.id);
});

// IDs de coordinadores ya asignados a algún bus (excluyendo el bus actual)
function coordinadoresOcupados(excludeBusId: string): string[] {
  return buses.value
    .filter(b => b.id !== excludeBusId)
    .flatMap(b => b.coordinadorIds ?? []);
}

// Opciones filtradas: solo coordinadores del viaje, no ocupados en otros buses
function getCoordinadorOptions(busId: string) {
  const delViaje = travel.value?.coordinadorIds ?? [];
  const ocupados = coordinadoresOcupados(busId);
  return coordinatorStore.allCoordinators
    .filter(c => delViaje.includes(c.id) && !ocupados.includes(c.id))
    .map(c => ({ value: c.id, label: c.nombre }));
}

function getProviderName(proveedorId: string): string {
  return providerStore.getProviderById(proveedorId)?.nombre ?? 'Proveedor desconocido';
}

function getEstadoColor(estado: string): 'success' | 'warning' | 'neutral' {
  if (estado === 'confirmado')
    return 'success';
  if (estado === 'apartado')
    return 'warning';
  return 'neutral';
}

function getEstadoLabel(estado: string): string {
  const labels: Record<string, string> = {
    confirmado: 'Confirmado',
    apartado: 'Apartado',
    pendiente: 'Pendiente',
  };
  return labels[estado] ?? estado;
}

function getBusCoordinadorIds(busId: string): string[] {
  const bus = buses.value.find(b => b.id === busId);
  return bus?.coordinadorIds ? [...bus.coordinadorIds] : [];
}

function getCoordinadorName(id: string): string {
  return coordinatorStore.getCoordinatorById(id)?.nombre ?? 'Desconocido';
}

function onCoordinadoresChange(busId: string, selected: string[]) {
  const capped = selected.slice(0, 2) as [] | [string] | [string, string];
  cotizacionStore.updateBusCotizacion(busId, { coordinadorIds: capped });
}

function goToCotizacion() {
  router.push({ name: 'travel-cotizacion', params: { id: travelId } });
}
</script>

<template>
  <div>
    <template v-if="cotizacion && buses.length > 0">
      <div class="space-y-3">
        <UCard
          v-for="bus in buses"
          :key="bus.id"
        >
          <template #header>
            <div class="flex justify-between items-center gap-4">
              <div class="flex items-center gap-2">
                <span class="i-lucide-bus w-4 h-4 text-muted" />
                <span class="font-medium">{{ getProviderName(bus.proveedorId) }}</span>
                <span v-if="bus.numeroUnidad" class="text-sm text-muted">· Unidad {{ bus.numeroUnidad }}</span>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <div class="flex items-center gap-1 text-sm text-muted">
                  <span class="i-lucide-users w-3.5 h-3.5" />
                  <span>{{ bus.capacidad }}</span>
                </div>
                <UBadge
                  :label="getEstadoLabel(bus.estado)"
                  :color="getEstadoColor(bus.estado)"
                  variant="subtle"
                  size="xs"
                />
              </div>
            </div>
          </template>

          <!-- Coordinadores (modo editable) -->
          <div v-if="editable">
            <div class="text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
              Coordinadores (máx. 2)
            </div>
            <USelectMenu
              :model-value="getBusCoordinadorIds(bus.id)"
              :items="getCoordinadorOptions(bus.id)"
              value-key="value"
              multiple
              placeholder="Seleccionar coordinadores"
              @update:model-value="(val) => onCoordinadoresChange(bus.id, val)"
            />
            <div v-if="getBusCoordinadorIds(bus.id).length > 0" class="flex items-center gap-3 mt-3">
              <div
                v-for="cId in getBusCoordinadorIds(bus.id)"
                :key="cId"
                class="flex items-center gap-2"
              >
                <UAvatar
                  :alt="getCoordinadorName(cId)"
                  size="sm"
                  color="primary"
                  variant="soft"
                />
                <span class="text-sm font-medium">{{ getCoordinadorName(cId) }}</span>
              </div>
            </div>
          </div>

          <!-- Coordinadores (modo lectura) -->
          <div v-else-if="bus.coordinadorIds && bus.coordinadorIds.length > 0">
            <div class="text-xs font-medium text-muted uppercase tracking-wide mb-2">
              Coordinadores
            </div>
            <div class="flex items-center gap-4">
              <div
                v-for="cId in bus.coordinadorIds"
                :key="cId"
                class="flex items-center gap-2"
              >
                <UAvatar
                  :alt="getCoordinadorName(cId)"
                  size="sm"
                  color="primary"
                  variant="soft"
                />
                <span class="text-sm font-medium">{{ getCoordinadorName(cId) }}</span>
              </div>
            </div>
          </div>

          <div v-else class="text-sm text-muted italic">
            Sin coordinadores asignados
          </div>

          <p v-if="bus.notas || bus.observaciones" class="text-sm text-muted mt-2 italic">
            {{ bus.notas || bus.observaciones }}
          </p>
        </UCard>
      </div>

      <div class="mt-4 p-4 bg-elevated/50 rounded-lg text-center">
        <p class="text-sm text-muted mb-2">
          ¿Necesitas agregar o modificar autobuses?
        </p>
        <UButton
          variant="outline"
          size="sm"
          label="Ir a Cotización"
          icon="i-lucide-arrow-right"
          @click="goToCotizacion"
        />
      </div>
    </template>

    <div v-else class="p-8 text-center bg-elevated rounded-lg">
      <span class="i-lucide-bus w-12 h-12 text-muted mx-auto mb-2 block opacity-50" />
      <p class="text-muted font-medium mb-2">
        Sin autobuses apartados
      </p>
      <p class="text-sm text-muted mb-4">
        Los autobuses se gestionan desde la cotización del viaje.
      </p>
      <UButton
        label="Ir a Cotización"
        icon="i-lucide-arrow-right"
        @click="goToCotizacion"
      />
    </div>
  </div>
</template>
