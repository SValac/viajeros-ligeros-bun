<script setup lang="ts">
type Props = {
  travelId: string;
};

const { travelId } = defineProps<Props>();

const router = useRouter();
const cotizacionStore = useCotizacionStore();
const providerStore = useProviderStore();

// Get travel ID and derived data
const cotizacion = computed(() => cotizacionStore.getCotizacionByTravel(travelId));
const proveedores = computed(() => {
  if (!cotizacion.value)
    return [];
  return cotizacionStore.filteredProveedores(cotizacion.value.id);
});

function getProviderName(providerId: string): string {
  return providerStore.getProviderById(providerId)?.name ?? 'Proveedor desconocido';
}

function goToCotizacion() {
  router.push({ name: 'travel-cotizacion', params: { id: travelId } });
}
</script>

<template>
  <div>
    <!-- Con servicios -->
    <template v-if="cotizacion && proveedores.length > 0">
      <div class="space-y-3">
        <UCard
          v-for="proveedor in proveedores"
          :key="proveedor.id"
        >
          <template #header>
            <div class="flex justify-between items-center gap-4">
              <div class="font-medium">
                {{ getProviderName(proveedor.providerId) }}
              </div>
              <div class="text-right shrink-0">
                <UBadge
                  :label="proveedor.confirmed ? 'Confirmado' : 'No confirmado'"
                  :color="proveedor.confirmed ? 'success' : 'warning'"
                  variant="subtle"
                  size="xs"
                />
              </div>
            </div>
          </template>
          <div class="flex justify-between items-center gap-4">
            <div class="text-sm text-muted mt-0.5">
              {{ proveedor.serviceDescription }}
            </div>
          </div>
        </UCard>
      </div>

      <!-- Link to cotización -->
      <div class="mt-4 p-4 bg-elevated/50 rounded-lg text-center">
        <p class="text-sm text-muted mb-2">
          ¿Necesitas agregar o modificar servicios?
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

    <!-- Sin cotización -->
    <div v-else class="p-8 text-center bg-elevated rounded-lg">
      <span class="i-lucide-clipboard w-12 h-12 text-muted mx-auto mb-2 block" />
      <p class="text-muted font-medium mb-2">
        Sin servicios agregados
      </p>
      <p class="text-sm text-muted mb-4">
        Los servicios se agregan desde la cotización del viaje.
      </p>
      <UButton
        label="Crear Cotización"
        icon="i-lucide-plus"
        @click="goToCotizacion"
      />
    </div>
  </div>
</template>
