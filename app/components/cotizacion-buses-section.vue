<script setup lang="ts">
import type { CotizacionBus, EstadoPagoBus } from '~/types/cotizacion';

type Props = {
  cotizacionId: string;
  readonly?: boolean;
};

type Emits = {
  (e: 'agregarBus'): void;
};

const { cotizacionId, readonly = false } = defineProps<Props>();

defineEmits<Emits>();

const cotizacionStore = useCotizacionStore();
const providerStore = useProviderStore();
const toast = useToast();

const buses = computed(() => cotizacionStore.getBusesByCotizacion(cotizacionId));

// Modal state
const isDetallesFormOpen = shallowRef(false);
const isHistorialOpen = shallowRef(false);
const isDeleteModalOpen = shallowRef(false);
const selectedBus = shallowRef<CotizacionBus | null>(null);

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
}

function getNombreAgencia(proveedorId: string): string {
  return providerStore.getProviderById(proveedorId)?.nombre ?? 'Desconocido';
}

function getEstadoPagoColor(estado: EstadoPagoBus): 'warning' | 'info' | 'success' {
  if (estado === 'pendiente')
    return 'warning';
  if (estado === 'anticipo')
    return 'info';
  return 'success';
}

function getEstadoPagoLabel(estado: EstadoPagoBus): string {
  if (estado === 'pendiente')
    return 'Pendiente';
  if (estado === 'anticipo')
    return 'Anticipo';
  return 'Liquidado';
}

function openHistorial(bus: CotizacionBus) {
  selectedBus.value = bus;
  isHistorialOpen.value = true;
}

function openDetalles(bus: CotizacionBus) {
  selectedBus.value = bus;
  isDetallesFormOpen.value = true;
}

function openDeleteConfirm(bus: CotizacionBus) {
  selectedBus.value = bus;
  isDeleteModalOpen.value = true;
}

function handleToggleConfirmado(bus: CotizacionBus) {
  if (readonly)
    return;
  cotizacionStore.updateBusCotizacion(bus.id, { confirmado: !bus.confirmado });
}

function handleDetallesSubmit(data: Partial<import('~/types/cotizacion').CotizacionBusFormData>) {
  if (!selectedBus.value)
    return;
  const result = cotizacionStore.updateBusCotizacion(selectedBus.value.id, data);
  if (result) {
    toast.add({ title: 'Autobús actualizado', color: 'success' });
  }
  isDetallesFormOpen.value = false;
  selectedBus.value = null;
}

function confirmDelete() {
  if (!selectedBus.value)
    return;
  cotizacionStore.deleteBusCotizacion(selectedBus.value.id);
  toast.add({ title: 'Autobús eliminado', color: 'warning' });
  isDeleteModalOpen.value = false;
  selectedBus.value = null;
}

function getBusActions(bus: CotizacionBus) {
  const readActions = [
    {
      label: 'Ver historial de pagos',
      icon: 'i-lucide-receipt',
      onSelect: () => openHistorial(bus),
    },
  ];

  if (readonly)
    return [readActions];

  return [
    readActions,
    [
      {
        label: 'Registrar pago',
        icon: 'i-lucide-banknote',
        disabled: cotizacionStore.getSaldoPendienteBus(bus.id) <= 0,
        onSelect: () => openHistorial(bus),
      },
      {
        label: 'Editar detalles',
        icon: 'i-lucide-pencil',
        onSelect: () => openDetalles(bus),
      },
      {
        label: bus.confirmado ? 'Marcar sin confirmar' : 'Marcar como confirmado',
        icon: bus.confirmado ? 'i-lucide-x-circle' : 'i-lucide-check-circle',
        onSelect: () => handleToggleConfirmado(bus),
      },
    ],
    [
      {
        label: 'Eliminar',
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect: () => openDeleteConfirm(bus),
      },
    ],
  ];
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between w-full">
        <h2 class="font-semibold flex items-center gap-2">
          <span class="i-lucide-bus w-5 h-5 text-muted" />
          Autobuses Apartados
        </h2>
        <UButton
          v-if="!readonly"
          icon="i-lucide-plus"
          size="xs"
          label="Agregar Autobús"
          @click="$emit('agregarBus')"
        />
      </div>
    </template>

    <!-- Tabla -->
    <div v-if="buses.length > 0" class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-default text-left text-muted">
            <th class="pb-2 pr-4 font-medium">
              Agencia
            </th>
            <th class="pb-2 pr-4 font-medium">
              Unidad
            </th>
            <th class="pb-2 pr-4 font-medium">
              Asientos
            </th>
            <th class="pb-2 pr-4 font-medium">
              División
            </th>
            <th class="pb-2 pr-4 font-medium">
              Costo Total
            </th>
            <th class="pb-2 pr-4 font-medium">
              Costo/persona
            </th>
            <th class="pb-2 pr-4 font-medium">
              Pagado
            </th>
            <th class="pb-2 pr-4 font-medium">
              Pendiente
            </th>
            <th class="pb-2 pr-4 font-medium">
              Método
            </th>
            <th class="pb-2 pr-4 font-medium">
              Estado Pago
            </th>
            <th class="pb-2 pr-4 font-medium">
              Confirmado
            </th>
            <th class="pb-2 font-medium">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="bus in buses"
            :key="bus.id"
            class="border-b border-default/50 hover:bg-elevated/50"
          >
            <td class="py-3 pr-4 font-medium">
              {{ getNombreAgencia(bus.proveedorId) }}
            </td>
            <td class="py-3 pr-4 font-mono">
              {{ bus.numeroUnidad }}
            </td>
            <td class="py-3 pr-4">
              {{ bus.capacidad }}
            </td>

            <!-- División -->
            <td class="py-3 pr-4">
              <UBadge
                :label="(bus.tipoDivision ?? 'minimo') === 'minimo' ? 'Asientos min.' : 'Cap. bus'"
                :color="(bus.tipoDivision ?? 'minimo') === 'minimo' ? 'info' : 'neutral'"
                variant="subtle"
                size="xs"
              />
            </td>

            <!-- Costo Total -->
            <td class="py-3 pr-4 font-medium">
              {{ formatCurrency(bus.costoTotal ?? 0) }}
            </td>

            <!-- Costo/persona -->
            <td class="py-3 pr-4">
              {{ formatCurrency(cotizacionStore.getCostoPerPersonaBus(bus.id)) }}
            </td>

            <!-- Pagado -->
            <td class="py-3 pr-4 text-success">
              {{ formatCurrency(cotizacionStore.getAnticipadoBus(bus.id)) }}
            </td>

            <!-- Pendiente -->
            <td class="py-3 pr-4">
              <span :class="cotizacionStore.getSaldoPendienteBus(bus.id) > 0 ? 'text-warning' : 'text-success'">
                {{ formatCurrency(cotizacionStore.getSaldoPendienteBus(bus.id)) }}
              </span>
            </td>

            <!-- Método -->
            <td class="py-3 pr-4">
              <UBadge
                :label="bus.metodoPago === 'cash' ? 'Efectivo' : 'Transferencia'"
                :color="bus.metodoPago === 'cash' ? 'success' : 'info'"
                variant="subtle"
                size="xs"
              />
            </td>

            <!-- Estado Pago -->
            <td class="py-3 pr-4">
              <UBadge
                :label="getEstadoPagoLabel(cotizacionStore.getEstadoPagoBus(bus.id))"
                :color="getEstadoPagoColor(cotizacionStore.getEstadoPagoBus(bus.id))"
                variant="subtle"
                size="xs"
              />
            </td>

            <!-- Confirmado -->
            <td class="py-3 pr-4">
              <UBadge
                :label="bus.confirmado ? 'Sí' : 'No'"
                :color="bus.confirmado ? 'success' : 'neutral'"
                variant="subtle"
                size="xs"
              />
            </td>

            <!-- Acciones -->
            <td class="py-3">
              <UDropdownMenu :items="getBusActions(bus)">
                <UButton
                  icon="i-lucide-more-vertical"
                  variant="ghost"
                  color="neutral"
                  size="xs"
                />
              </UDropdownMenu>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty state -->
    <div v-else class="py-10 text-center bg-elevated/50 rounded-lg">
      <span class="i-lucide-bus w-12 h-12 text-muted mx-auto mb-2 block" />
      <p class="text-muted">
        No hay autobuses apartados en esta cotización
      </p>
      <UButton
        v-if="!readonly"
        variant="ghost"
        size="sm"
        label="Agregar primer autobús"
        class="mt-2"
        @click="$emit('agregarBus')"
      />
    </div>
  </UCard>

  <!-- Slideover: historial de pagos -->
  <USlideover
    v-model:open="isHistorialOpen"
    :title="selectedBus ? `Pagos — ${selectedBus.numeroUnidad}` : 'Historial de Pagos'"
    description="Registro de pagos realizados a la agencia"
    side="right"
  >
    <template #body>
      <div class="p-4">
        <PagoBusHistorial
          v-if="selectedBus"
          :cotizacion-bus-id="selectedBus.id"
          :bus-label="selectedBus.numeroUnidad"
          :readonly="readonly"
        />
      </div>
    </template>
  </USlideover>

  <!-- Modal: editar detalles financieros -->
  <UModal
    v-model:open="isDetallesFormOpen"
    title="Detalles de Cotización"
    description="Actualiza los datos financieros del autobús"
    class="sm:max-w-lg"
  >
    <template #body>
      <CotizacionBusCotizacionForm
        v-if="selectedBus"
        :bus="selectedBus"
        @submit="handleDetallesSubmit"
        @cancel="isDetallesFormOpen = false"
      />
    </template>
  </UModal>

  <!-- Modal: confirmar eliminación -->
  <UModal
    v-model:open="isDeleteModalOpen"
    title="Eliminar Autobús"
    description="¿Estás seguro? Se eliminarán también todos los pagos asociados."
  >
    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton
          variant="ghost"
          color="neutral"
          label="Cancelar"
          @click="isDeleteModalOpen = false"
        />
        <UButton
          color="error"
          label="Eliminar"
          @click="confirmDelete"
        />
      </div>
    </template>
  </UModal>
</template>
