<script setup lang="ts">
import type { QuotationExpense, QuotationExpenseFormData } from '~/types/quotation';

import { formatCurrency } from '~/utils/currency';

type Props = {
  quotationId: string;
  readonly?: boolean;
};

const { quotationId, readonly = false } = defineProps<Props>();

const cotizacionStore = useCotizacionStore();
const toast = useToast();

const gastos = computed(() => cotizacionStore.getGastosByQuotation(quotationId));
const totalGastos = computed(() => cotizacionStore.getTotalGastos(quotationId));
const totalPorAsiento = computed(() => gastos.value.reduce((sum, g) => sum + getCostoPorAsiento(g), 0));

// Lo que suma un gasto al precio de cada asiento: su total entre el divisor de "Dividir entre".
function getCostoPorAsiento(gasto: QuotationExpense): number {
  const divisor = cotizacionStore.getDivisorCosto(quotationId, gasto.splitType);
  return divisor > 0 ? gasto.totalCost / divisor : 0;
}

const isFormOpen = shallowRef(false);
const selectedGasto = shallowRef<QuotationExpense | null>(null);
const isDeleteModalOpen = shallowRef(false);
const gastoToDelete = shallowRef<QuotationExpense | null>(null);

function openNew() {
  selectedGasto.value = null;
  isFormOpen.value = true;
}

function openEdit(gasto: QuotationExpense) {
  selectedGasto.value = gasto;
  isFormOpen.value = true;
}

function openDeleteConfirm(gasto: QuotationExpense) {
  gastoToDelete.value = gasto;
  isDeleteModalOpen.value = true;
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false;
}

async function handleSubmit(data: QuotationExpenseFormData) {
  const result = selectedGasto.value
    ? await cotizacionStore.updateGasto(selectedGasto.value.id, data)
    : await cotizacionStore.addGasto(data);
  if ('error' in result) {
    toast.add({ title: 'No se pudo guardar el gasto', description: result.error, color: 'error' });
    return;
  }
  toast.add({ title: selectedGasto.value ? 'Gasto actualizado' : 'Gasto agregado', color: 'success' });
  isFormOpen.value = false;
  selectedGasto.value = null;
}

async function confirmDelete() {
  if (!gastoToDelete.value)
    return;
  const deleted = await cotizacionStore.deleteGasto(gastoToDelete.value.id);
  if (deleted)
    toast.add({ title: 'Gasto eliminado', color: 'warning' });
  else
    toast.add({ title: 'No se pudo eliminar el gasto', description: cotizacionStore.error ?? undefined, color: 'error' });
  isDeleteModalOpen.value = false;
  gastoToDelete.value = null;
}

function getActions(gasto: QuotationExpense) {
  return [
    [{ label: 'Editar', icon: 'i-lucide-pencil', onSelect: () => openEdit(gasto) }],
    [{ label: 'Eliminar', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => openDeleteConfirm(gasto) }],
  ];
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="font-semibold flex items-center gap-2">
            <UIcon name="i-lucide-receipt" class="w-5 h-5 text-muted" />
            Gastos adicionales
          </h2>
          <p class="text-sm text-muted mt-1">
            Publicidad, viáticos, comisiones, box lunch… Se reparten en el precio por asiento como los proveedores.
          </p>
        </div>
        <UButton
          v-if="!readonly"
          icon="i-lucide-plus"
          label="Agregar gasto"
          @click="openNew"
        />
      </div>
    </template>

    <div v-if="gastos.length > 0" class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-default text-left text-muted">
            <th class="pb-2 pr-4 font-medium">
              Categoría
            </th>
            <th class="pb-2 pr-4 font-medium">
              Descripción
            </th>
            <th class="pb-2 pr-4 font-medium">
              División
            </th>
            <th class="pb-2 pr-4 font-medium text-right">
              Costo total
            </th>
            <th class="pb-2 pr-4 font-medium text-right">
              Por asiento
            </th>
            <th v-if="!readonly" class="pb-2 font-medium">
              <span class="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="gasto in gastos"
            :key="gasto.id"
            class="border-b border-default/50 hover:bg-elevated/50"
          >
            <td class="py-3 pr-4">
              <UBadge
                :label="gasto.category"
                color="neutral"
                variant="subtle"
              />
            </td>
            <td class="py-3 pr-4 max-w-60">
              <span class="truncate block" :class="{ 'text-muted': !gasto.description }">
                {{ gasto.description ?? '—' }}
              </span>
            </td>
            <td class="py-3 pr-4">
              <UBadge
                :label="gasto.splitType === 'minimum' ? 'Asientos min.' : 'Asientos vend.'"
                :color="gasto.splitType === 'minimum' ? 'info' : 'neutral'"
                variant="subtle"
              />
            </td>
            <td class="py-3 pr-4 text-right tabular-nums">
              <p class="font-medium">
                {{ formatCurrency(gasto.totalCost) }}
              </p>
              <p
                v-if="gasto.costType === 'per_person'"
                class="text-xs text-muted whitespace-nowrap"
              >
                {{ formatCurrency(gasto.unitCost ?? 0) }} × {{ gasto.personCount }} pers.
              </p>
            </td>
            <td class="py-3 pr-4 text-right tabular-nums">
              {{ formatCurrency(getCostoPorAsiento(gasto)) }}
            </td>
            <td v-if="!readonly" class="py-3 text-right">
              <UDropdownMenu :items="getActions(gasto)">
                <UButton
                  icon="i-lucide-ellipsis-vertical"
                  variant="ghost"
                  color="neutral"
                  size="sm"
                  aria-label="Acciones del gasto"
                />
              </UDropdownMenu>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="font-semibold">
            <td colspan="3" class="pt-3 pr-4">
              Total
            </td>
            <td class="pt-3 pr-4 text-right tabular-nums">
              {{ formatCurrency(totalGastos) }}
            </td>
            <td class="pt-3 pr-4 text-right tabular-nums">
              {{ formatCurrency(totalPorAsiento) }}
            </td>
            <td v-if="!readonly" />
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Estado vacío -->
    <div v-else class="py-10 text-center bg-elevated/50 rounded-lg">
      <UIcon name="i-lucide-receipt" class="w-12 h-12 text-muted mx-auto mb-2 block" />
      <p class="text-muted">
        No hay gastos adicionales en esta cotización
      </p>
      <UButton
        v-if="!readonly"
        variant="ghost"
        size="sm"
        label="Agregar primer gasto"
        class="mt-2"
        @click="openNew"
      />
    </div>
  </UCard>

  <!-- Modal: form de gasto -->
  <UModal
    v-model:open="isFormOpen"
    :title="selectedGasto ? 'Editar gasto' : 'Agregar gasto'"
    description="Un gasto de la cotización que se reparte en el precio por asiento"
    class="sm:max-w-xl"
  >
    <template #body>
      <CotizacionGastoForm
        :quotation-id="quotationId"
        :gasto="selectedGasto"
        @submit="handleSubmit"
        @cancel="isFormOpen = false"
      />
    </template>
  </UModal>

  <!-- Modal: confirmar eliminación -->
  <UModal
    v-model:open="isDeleteModalOpen"
    title="Eliminar gasto"
    :description="gastoToDelete ? `¿Eliminar ${gastoToDelete.category} (${formatCurrency(gastoToDelete.totalCost)})? El precio por asiento se recalcula.` : undefined"
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
          @click="confirmDelete"
        />
      </div>
    </template>
  </UModal>
</template>
