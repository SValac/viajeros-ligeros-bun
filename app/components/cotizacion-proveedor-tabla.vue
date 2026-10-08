<script setup lang="ts">
import type { ProviderPaymentStatus, QuotationProvider, QuotationProviderFormData } from '~/types/quotation';

import { formatCurrency } from '~/utils/currency';

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
const isOpcionalOpen = shallowRef(false);
const proveedorOpcional = shallowRef<QuotationProvider | null>(null);

// El viaje de la cotización, para enlazar a su pestaña de servicios opcionales.
const travelId = computed(() => cotizacionStore.cotizaciones.find(c => c.id === quotationId)?.travelId);

// Filter options
const estadoPagoOptions = [
  { label: 'Todos', value: 'all' },
  { label: 'Pendiente', value: 'pending' },
  { label: 'Anticipo', value: 'partial' },
  { label: 'Liquidado', value: 'paid' },
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

function getDivisor(proveedor: QuotationProvider): number {
  return cotizacionStore.getDivisorCosto(proveedor.quotationId, proveedor.splitType ?? 'minimum');
}

// Un costo por persona no se recalcula solo: avisa cuando sus personas no coinciden con
// el divisor actual (las editó el usuario o cambiaron los asientos), sin mover saldos.
function hasPersonCountDrift(proveedor: QuotationProvider): boolean {
  return proveedor.costType === 'per_person' && proveedor.personCount !== getDivisor(proveedor);
}

// Cuántos viajeros cuentan para el pago de un servicio opcional.
function getTakersCount(proveedor: QuotationProvider): number {
  return proveedor.unitCost ? Math.round(proveedor.payableCost / proveedor.unitCost) : 0;
}

function openOpcional(proveedor: QuotationProvider) {
  proveedorOpcional.value = proveedor;
  isOpcionalOpen.value = true;
}

async function handleOpcionalSubmit(data: { isOptional: boolean; coordinatorsCourtesy: boolean }) {
  if (!proveedorOpcional.value)
    return;
  const result = await cotizacionStore.updateProveedorOpcional(proveedorOpcional.value.id, data);
  if ('error' in result) {
    toast.add({ title: 'Error', description: result.error, color: 'error' });
    return;
  }
  toast.add({ title: 'Cobro actualizado', color: 'success' });
  isOpcionalOpen.value = false;
  proveedorOpcional.value = null;
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

function closeDeleteModal() {
  isDeleteModalOpen.value = false;
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
  // Payments go on after the quotation is confirmed; only its structure is locked.
  const paymentActions = [
    {
      label: 'Ver historial de pagos',
      icon: 'i-lucide-receipt',
      onSelect: () => openHistorial(proveedor),
    },
    {
      label: 'Registrar pago',
      icon: 'i-lucide-banknote',
      disabled: cotizacionStore.getSaldoPendienteProveedor(proveedor.id) <= 0,
      onSelect: () => openRegistrarPago(proveedor),
    },
    // Cómo se le paga a un servicio por persona; no cambia el precio del asiento, así que
    // también se puede con la cotización confirmada.
    ...(proveedor.costType === 'per_person'
      ? [{
          label: 'Cobro por viajero',
          icon: 'i-lucide-ticket-check',
          onSelect: () => openOpcional(proveedor),
        }]
      : []),
  ];

  if (readonly)
    return [paymentActions];

  const writeActions = [
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

  return [paymentActions, writeActions, destructiveActions];
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
              A pagar
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
                <UIcon
                  v-if="isProviderInactive(proveedor.providerId)"
                  name="i-lucide-triangle-alert"
                  class="w-4 h-4 text-warning shrink-0"
                  title="Proveedor inactivo en el catálogo"
                />
                <span class="font-medium">{{ getProviderName(proveedor.providerId) }}</span>
              </div>
            </td>

            <!-- Servicio -->
            <td class="py-3 pr-4 max-w-40">
              <span class="truncate block">{{ proveedor.serviceDescription }}</span>
              <UBadge
                v-if="proveedor.isOptional"
                label="Opcional"
                icon="i-lucide-ticket-check"
                color="info"
                variant="subtle"
                class="mt-1"
              />
            </td>

            <!-- División -->
            <td class="py-3 pr-4">
              <UBadge
                :label="(proveedor.splitType ?? 'minimum') === 'minimum' ? 'Asientos min.' : 'Asientos vend.'"
                :color="(proveedor.splitType ?? 'minimum') === 'minimum' ? 'info' : 'neutral'"
                variant="subtle"
              />
            </td>

            <!-- Costo Total -->
            <td class="py-3 pr-4">
              <p class="font-medium">
                {{ formatCurrency(proveedor.totalCost) }}
              </p>
              <p
                v-if="proveedor.costType === 'per_person'"
                class="text-xs text-muted flex items-center gap-1 whitespace-nowrap"
              >
                {{ formatCurrency(proveedor.unitCost ?? 0) }} × {{ proveedor.personCount }} pers.
                <UIcon
                  v-if="hasPersonCountDrift(proveedor)"
                  name="i-lucide-alert-triangle"
                  class="size-3.5 text-warning shrink-0"
                  :title="`Calculado para ${proveedor.personCount} personas, pero el costo se reparte entre ${getDivisor(proveedor)}. Edita el servicio si debe recalcularse.`"
                />
              </p>
            </td>

            <!-- A pagar: en un opcional, solo por los viajeros que lo toman -->
            <td class="py-3 pr-4">
              <p class="font-medium">
                {{ formatCurrency(proveedor.payableCost) }}
              </p>
              <ULink
                v-if="proveedor.isOptional && travelId"
                :to="{ name: 'travel-optional-services', params: { id: travelId } }"
                class="text-xs text-primary whitespace-nowrap"
              >
                {{ getTakersCount(proveedor) }} lo toman
              </ULink>
            </td>

            <!-- Costo/persona -->
            <td class="py-3 pr-4">
              {{ formatCurrency(cotizacionStore.getCostoPerPersonaProveedor(proveedor.id)) }}
            </td>

            <!-- Pagado -->
            <td class="py-3 pr-4">
              {{ formatCurrency(cotizacionStore.getAnticipadoProveedor(proveedor.id)) }}
            </td>

            <!-- Pendiente -->
            <td class="py-3 pr-4">
              <span :class="cotizacionStore.getSaldoPendienteProveedor(proveedor.id) > 0 ? 'text-warning' : 'text-success'">
                {{ formatCurrency(cotizacionStore.getSaldoPendienteProveedor(proveedor.id)) }}
              </span>
              <p
                v-if="cotizacionStore.getSobrepagoProveedor(proveedor.id) > 0"
                class="text-xs text-error whitespace-nowrap"
              >
                Pagado de más: {{ formatCurrency(cotizacionStore.getSobrepagoProveedor(proveedor.id)) }}
              </p>
            </td>

            <!-- Método -->
            <td class="py-3 pr-4">
              <UBadge
                :label="proveedor.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'"
                color="neutral"
                variant="subtle"
              />
            </td>

            <!-- Estado Pago -->
            <td class="py-3 pr-4">
              <UBadge
                :label="getEstadoPagoLabel(cotizacionStore.getProviderPaymentStatus(proveedor.id))"
                :color="getEstadoPagoColor(cotizacionStore.getProviderPaymentStatus(proveedor.id))"
                variant="subtle"
              />
            </td>

            <!-- Confirmado -->
            <td class="py-3 pr-4">
              <UBadge
                :label="proveedor.confirmed ? 'Sí' : 'No'"
                :color="proveedor.confirmed ? 'success' : 'neutral'"
                variant="subtle"
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
      <UIcon name="i-lucide-package-x" class="w-12 h-12 text-muted mx-auto mb-2 block" />
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

  <!-- Modal: cobro por viajero -->
  <UModal
    v-model:open="isOpcionalOpen"
    title="Cobro por viajero"
    description="Define si al proveedor se le paga solo por los viajeros que toman el servicio"
  >
    <template #body>
      <CotizacionProveedorOpcionalForm
        v-if="proveedorOpcional"
        :proveedor="proveedorOpcional"
        @submit="handleOpcionalSubmit"
        @cancel="isOpcionalOpen = false"
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
          @click="closeDeleteModal"
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
