<script setup lang="ts">
import type { ProviderPaymentStatus, QuotationProvider, QuotationProviderFormData } from '~/types/quotation';

type Props = {
  quotationId: string;
  readonly?: boolean;
};

const { quotationId, readonly = false } = defineProps<Props>();

const cotizacionStore = useCotizacionStore();
const providerStore = useProviderStore();
const toast = useToast();

// Derived data
const proveedores = computed(() => cotizacionStore.filteredProveedores(quotationId));

// Filter state (local — synced to store)
const filterEstadoPago = shallowRef<ProviderPaymentStatus | 'all'>('all');
const filterConfirmado = shallowRef<'all' | 'si' | 'no'>('all');
const filterMetodoPago = shallowRef<'all' | 'cash' | 'transfer'>('all');

watch([filterEstadoPago, filterConfirmado, filterMetodoPago], () => {
  cotizacionStore.setFilters({
    paymentStatus: filterEstadoPago.value,
    confirmed: filterConfirmado.value === 'all'
      ? 'all'
      : filterConfirmado.value === 'si',
    paymentMethod: filterMetodoPago.value,
  });
});

// Modal state
const isProveedorFormOpen = shallowRef(false);
const selectedProveedor = shallowRef<QuotationProvider | null>(null);
const isHistorialOpen = shallowRef(false);
const historialProveedorId = shallowRef<string>('');
const historialProveedorNombre = shallowRef<string>('');
const isDeleteModalOpen = shallowRef(false);
const proveedorToDelete = shallowRef<QuotationProvider | null>(null);

// Filter options
const estadoPagoOptions = [
  { label: 'Todos', value: 'all' },
  { label: 'Pendiente', value: 'pending' },
  { label: 'Anticipo', value: 'partial' },
  { label: 'Liquidado', value: 'liquidado' },
];

const confirmadoOptions = [
  { label: 'Todos', value: 'all' },
  { label: 'Sí', value: 'si' },
  { label: 'No', value: 'no' },
];

const metodoPagoOptions = [
  { label: 'Todos', value: 'all' },
  { label: 'Efectivo', value: 'cash' },
  { label: 'Transferencia', value: 'transfer' },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

function getEstadoPagoColor(status: ProviderPaymentStatus): 'warning' | 'info' | 'success' {
  if (status === 'pending')
    return 'warning';
  if (status === 'partial')
    return 'info';
  return 'success';
}

function getEstadoPagoLabel(status: ProviderPaymentStatus): string {
  if (status === 'pending')
    return 'Pendiente';
  if (status === 'partial')
    return 'Anticipo';
  return 'Liquidado';
}

function getProviderName(providerId: string): string {
  return providerStore.getProviderById(providerId)?.name ?? 'Proveedor desconocido';
}

function isProviderInactive(providerId: string): boolean {
  const provider = providerStore.getProviderById(providerId);
  return provider ? !provider.active : false;
}

function openNewProveedor() {
  selectedProveedor.value = null;
  isProveedorFormOpen.value = true;
}

function openEditProveedor(proveedor: QuotationProvider) {
  selectedProveedor.value = proveedor;
  isProveedorFormOpen.value = true;
}

function openHistorial(proveedor: QuotationProvider) {
  historialProveedorId.value = proveedor.id;
  historialProveedorNombre.value = getProviderName(proveedor.providerId);
  isHistorialOpen.value = true;
}

function openRegistrarPago(proveedor: QuotationProvider) {
  historialProveedorId.value = proveedor.id;
  historialProveedorNombre.value = getProviderName(proveedor.providerId);
  isHistorialOpen.value = true;
}

function openDeleteConfirm(proveedor: QuotationProvider) {
  proveedorToDelete.value = proveedor;
  isDeleteModalOpen.value = true;
}

async function handleProveedorSubmit(data: QuotationProviderFormData) {
  if (selectedProveedor.value) {
    const result = await cotizacionStore.updateProveedorQuotation(selectedProveedor.value.id, data);
    if (result) {
      toast.add({ title: 'Proveedor actualizado', color: 'success' });
    }
  }
  else {
    const result = await cotizacionStore.addProveedorQuotation(data);
    if ('error' in result) {
      toast.add({ title: 'Error', description: result.error, color: 'error' });
    }
    else {
      toast.add({ title: 'Proveedor agregado', color: 'success' });
    }
  }
  isProveedorFormOpen.value = false;
  selectedProveedor.value = null;
}

async function handleToggleConfirmado(proveedor: QuotationProvider) {
  if (readonly)
    return;
  await cotizacionStore.toggleConfirmadoProveedor(proveedor.id);
}

async function confirmDeleteProveedor() {
  if (!proveedorToDelete.value)
    return;
  await cotizacionStore.deleteProveedorQuotation(proveedorToDelete.value.id);
  toast.add({ title: 'Proveedor eliminado', color: 'warning' });
  isDeleteModalOpen.value = false;
  proveedorToDelete.value = null;
}

function getProveedorActions(proveedor: QuotationProvider) {
  const readActions = [
    {
      label: 'Ver historial de pagos',
      icon: 'i-lucide-receipt',
      onSelect: () => openHistorial(proveedor),
    },
  ];

  if (readonly)
    return readActions;

  const writeActions = [
    {
      label: 'Registrar pago',
      icon: 'i-lucide-banknote',
      disabled: cotizacionStore.getSaldoPendienteProveedor(proveedor.id) <= 0,
      onSelect: () => openRegistrarPago(proveedor),
    },
    {
      label: 'Editar',
      icon: 'i-lucide-pencil',
      onSelect: () => openEditProveedor(proveedor),
    },
    {
      label: proveedor.confirmed ? 'Marcar sin confirmar' : 'Marcar como confirmado',
      icon: proveedor.confirmed ? 'i-lucide-x-circle' : 'i-lucide-check-circle',
      onSelect: () => handleToggleConfirmado(proveedor),
    },
  ];

  const destructiveActions = [
    {
      label: 'Eliminar',
      icon: 'i-lucide-trash-2',
      color: 'error' as const,
      onSelect: () => openDeleteConfirm(proveedor),
    },
  ];

  return [readActions, writeActions, destructiveActions];
}
</script>

<template>
  <div class="space-y-4">
    <!-- Barra de filtros -->
    <div class="flex flex-wrap gap-3 items-end">
      <div class="flex-1 min-w-32">
        <p class="text-xs text-muted mb-1">
          Estado de pago
        </p>
        <USelect
          v-model="filterEstadoPago"
          :items="estadoPagoOptions"
          size="sm"
        />
      </div>
      <div class="flex-1 min-w-28">
        <p class="text-xs text-muted mb-1">
          Confirmado
        </p>
        <USelect
          v-model="filterConfirmado"
          :items="confirmadoOptions"
          size="sm"
        />
      </div>
      <div class="flex-1 min-w-32">
        <p class="text-xs text-muted mb-1">
          Método de pago
        </p>
        <USelect
          v-model="filterMetodoPago"
          :items="metodoPagoOptions"
          size="sm"
        />
      </div>
      <UButton
        v-if="!readonly"
        icon="i-lucide-plus"
        label="Agregar proveedor"
        @click="openNewProveedor"
      />
    </div>

    <!-- Tabla -->
    <div v-if="proveedores.length > 0" class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-default text-left text-muted">
            <th class="pb-2 pr-4 font-medium">
              Proveedor
            </th>
            <th class="pb-2 pr-4 font-medium">
              Servicio
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
            v-for="proveedor in proveedores"
            :key="proveedor.id"
            class="border-b border-default/50 hover:bg-elevated/50"
          >
            <!-- Proveedor -->
            <td class="py-3 pr-4">
              <div class="flex items-center gap-1.5">
                <span
                  v-if="isProviderInactive(proveedor.providerId)"
                  class="i-lucide-alert-triangle w-4 h-4 text-warning shrink-0"
                  title="Proveedor inactivo en el catálogo"
                />
                <span class="font-medium">{{ getProviderName(proveedor.providerId) }}</span>
              </div>
            </td>

            <!-- Servicio -->
            <td class="py-3 pr-4 max-w-40">
              <span class="truncate block">{{ proveedor.serviceDescription }}</span>
            </td>

            <!-- División -->
            <td class="py-3 pr-4">
              <UBadge
                :label="(proveedor.splitType ?? 'minimum') === 'minimum' ? 'Asientos min.' : 'Cap. bus'"
                :color="(proveedor.splitType ?? 'minimum') === 'minimum' ? 'info' : 'neutral'"
                variant="subtle"
                size="xs"
              />
            </td>

            <!-- Costo Total -->
            <td class="py-3 pr-4 font-medium">
              {{ formatCurrency(proveedor.totalCost) }}
            </td>

            <!-- Costo/persona -->
            <td class="py-3 pr-4">
              {{ formatCurrency(cotizacionStore.getCostoPerPersonaProveedor(proveedor.id)) }}
            </td>

            <!-- Pagado -->
            <td class="py-3 pr-4 text-success">
              {{ formatCurrency(cotizacionStore.getAnticipadoProveedor(proveedor.id)) }}
            </td>

            <!-- Pendiente -->
            <td class="py-3 pr-4">
              <span :class="cotizacionStore.getSaldoPendienteProveedor(proveedor.id) > 0 ? 'text-warning' : 'text-success'">
                {{ formatCurrency(cotizacionStore.getSaldoPendienteProveedor(proveedor.id)) }}
              </span>
            </td>

            <!-- Método -->
            <td class="py-3 pr-4">
              <UBadge
                :label="proveedor.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'"
                :color="proveedor.paymentMethod === 'cash' ? 'success' : 'info'"
                variant="subtle"
                size="xs"
              />
            </td>

            <!-- Estado Pago -->
            <td class="py-3 pr-4">
              <UBadge
                :label="getEstadoPagoLabel(cotizacionStore.getProviderPaymentStatus(proveedor.id))"
                :color="getEstadoPagoColor(cotizacionStore.getProviderPaymentStatus(proveedor.id))"
                variant="subtle"
                size="xs"
              />
            </td>

            <!-- Confirmado -->
            <td class="py-3 pr-4">
              <UBadge
                :label="proveedor.confirmed ? 'Sí' : 'No'"
                :color="proveedor.confirmed ? 'success' : 'neutral'"
                variant="subtle"
                size="xs"
              />
            </td>

            <!-- Acciones -->
            <td class="py-3">
              <UDropdownMenu :items="getProveedorActions(proveedor)">
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

    <!-- Estado vacío -->
    <div v-else class="py-10 text-center bg-elevated/50 rounded-lg">
      <span class="i-lucide-package-x w-12 h-12 text-muted mx-auto mb-2 block" />
      <p class="text-muted">
        No hay proveedores en esta cotización
      </p>
      <UButton
        v-if="!readonly"
        variant="ghost"
        size="sm"
        label="Agregar primer proveedor"
        class="mt-2"
        @click="openNewProveedor"
      />
    </div>
  </div>

  <!-- Modal: form de proveedor -->
  <UModal
    v-model:open="isProveedorFormOpen"
    :title="selectedProveedor ? 'Editar Proveedor' : 'Agregar Proveedor'"
    :description="selectedProveedor ? 'Modifica los datos del proveedor en la cotización' : 'Agrega un nuevo proveedor de servicio a la cotización'"
    class="sm:max-w-2xl"
  >
    <template #body>
      <CotizacionProveedorForm
        :quotation-id="quotationId"
        :proveedor-cotizacion="selectedProveedor"
        @submit="handleProveedorSubmit"
        @cancel="isProveedorFormOpen = false"
      />
    </template>
  </UModal>

  <!-- Drawer/modal: historial de pagos -->
  <USlideover
    v-model:open="isHistorialOpen"
    :title="`Pagos — ${historialProveedorNombre}`"
    description="Registro de pagos realizados al proveedor"
    side="right"
  >
    <template #body>
      <div class="p-4">
        <PagoProveedorHistorial
          :quotation-provider-id="historialProveedorId"
          :readonly="readonly"
          :proveedor-name="historialProveedorNombre"
        />
      </div>
    </template>
  </USlideover>

  <!-- Modal: confirmar eliminación -->
  <UModal
    v-model:open="isDeleteModalOpen"
    title="Eliminar Proveedor"
    description="¿Estás seguro? Se eliminarán también todos los pagos asociados a este proveedor."
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
          @click="confirmDeleteProveedor"
        />
      </div>
    </template>
  </UModal>
</template>
