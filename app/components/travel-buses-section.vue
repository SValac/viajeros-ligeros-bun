<script setup lang="ts">
type Props = {
  travelId: string;
};

const { travelId } = defineProps<Props>();

const router = useRouter();
const cotizacionStore = useCotizacionStore();
const providerStore = useProviderStore();

const cotizacion = computed(() => cotizacionStore.getCotizacionByTravel(travelId));
const buses = computed(() => {
  if (!cotizacion.value)
    return [];
  return cotizacionStore.getBusesByCotizacion(cotizacion.value.id);
});

function getProviderName(proveedorId: string): string {
  return providerStore.getProviderById(proveedorId)?.nombre ?? 'Proveedor desconocido';
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
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
              <UBadge
                :label="getEstadoLabel(bus.estado)"
                :color="getEstadoColor(bus.estado)"
                variant="subtle"
                size="xs"
              />
            </div>
          </template>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div class="flex items-center gap-1.5 text-muted">
              <span class="i-lucide-users w-4 h-4" />
              <span>{{ bus.capacidad }} asientos</span>
            </div>
            <div class="flex items-center gap-1.5 text-muted">
              <span class="i-lucide-banknote w-4 h-4" />
              <span>{{ formatCurrency(bus.costoTotal) }}</span>
            </div>
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
