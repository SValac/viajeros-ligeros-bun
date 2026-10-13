<script setup lang="ts">
import type { QuotationExpense, QuotationExpenseFormData } from '~/types/quotation';

import { useTravelCoordinatorCount } from '~/composables/travels/use-travel-coordinator-count';
import { formatCurrency } from '~/utils/currency';

type Props = {
  quotationId: string;
  readonly?: boolean;
};

const { quotationId, readonly = false } = defineProps<Props>();

const quotationStore = useQuotationStore();
const travelId = computed(() => quotationStore.quotations.find(c => c.id === quotationId)?.travelId);
const coordinatorCount = useTravelCoordinatorCount(travelId);
const toast = useToast();

const expenses = computed(() => quotationStore.getExpensesByQuotation(quotationId));
const expensesTotal = computed(() => quotationStore.getExpensesTotal(quotationId));
const totalPerSeat = computed(() => expenses.value.reduce((sum, g) => sum + getCostPerSeat(g), 0));

// Lo que suma un gasto al precio de cada asiento: su total entre el divisor de "Dividir entre".
function getCostPerSeat(expense: QuotationExpense): number {
  const divisor = quotationStore.getCostDivisor(quotationId, expense.splitType, coordinatorCount.value);
  return divisor > 0 ? expense.totalCost / divisor : 0;
}

const isFormOpen = shallowRef(false);
const selectedExpense = shallowRef<QuotationExpense | null>(null);
const isDeleteModalOpen = shallowRef(false);
const expenseToDelete = shallowRef<QuotationExpense | null>(null);

function openNew() {
  selectedExpense.value = null;
  isFormOpen.value = true;
}

function openEdit(expense: QuotationExpense) {
  selectedExpense.value = expense;
  isFormOpen.value = true;
}

function openDeleteConfirm(expense: QuotationExpense) {
  expenseToDelete.value = expense;
  isDeleteModalOpen.value = true;
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false;
}

async function handleSubmit(data: QuotationExpenseFormData) {
  const result = selectedExpense.value
    ? await quotationStore.updateExpense(selectedExpense.value.id, data)
    : await quotationStore.addExpense(data);
  if ('error' in result) {
    toast.add({ title: 'No se pudo guardar el gasto', description: result.error, color: 'error' });
    return;
  }
  toast.add({ title: selectedExpense.value ? 'Gasto actualizado' : 'Gasto agregado', color: 'success' });
  isFormOpen.value = false;
  selectedExpense.value = null;
}

async function confirmDelete() {
  if (!expenseToDelete.value)
    return;
  const deleted = await quotationStore.deleteExpense(expenseToDelete.value.id);
  if (deleted)
    toast.add({ title: 'Gasto eliminado', color: 'warning' });
  else
    toast.add({ title: 'No se pudo eliminar el gasto', description: quotationStore.error ?? undefined, color: 'error' });
  isDeleteModalOpen.value = false;
  expenseToDelete.value = null;
}

function getActions(expense: QuotationExpense) {
  return [
    [{ label: 'Editar', icon: 'i-lucide-pencil', onSelect: () => openEdit(expense) }],
    [{ label: 'Eliminar', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => openDeleteConfirm(expense) }],
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

    <div v-if="expenses.length > 0" class="overflow-x-auto">
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
            v-for="expense in expenses"
            :key="expense.id"
            class="border-b border-default/50 hover:bg-elevated/50"
          >
            <td class="py-3 pr-4">
              <UBadge
                :label="expense.category"
                color="neutral"
                variant="subtle"
              />
            </td>
            <td class="py-3 pr-4 max-w-60">
              <span class="truncate block" :class="{ 'text-muted': !expense.description }">
                {{ expense.description ?? '—' }}
              </span>
            </td>
            <td class="py-3 pr-4">
              <UBadge
                :label="expense.splitType === 'minimum' ? 'Asientos min.' : 'Asientos vend.'"
                :color="expense.splitType === 'minimum' ? 'info' : 'neutral'"
                variant="subtle"
              />
            </td>
            <td class="py-3 pr-4 text-right tabular-nums">
              <p class="font-medium">
                {{ formatCurrency(expense.totalCost) }}
              </p>
              <p
                v-if="expense.costType === 'per_person'"
                class="text-xs text-muted whitespace-nowrap"
              >
                {{ formatCurrency(expense.unitCost ?? 0) }} × {{ expense.personCount }} pers.
              </p>
            </td>
            <td class="py-3 pr-4 text-right tabular-nums">
              {{ formatCurrency(getCostPerSeat(expense)) }}
            </td>
            <td v-if="!readonly" class="py-3 text-right">
              <UDropdownMenu :items="getActions(expense)">
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
              {{ formatCurrency(expensesTotal) }}
            </td>
            <td class="pt-3 pr-4 text-right tabular-nums">
              {{ formatCurrency(totalPerSeat) }}
            </td>
            <td v-if="!readonly" />
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Estado vacío -->
    <EmptyState
      v-else
      section="expenses"
      :actions="readonly ? undefined : [{ label: 'Agregar gasto', icon: 'i-lucide-plus', onClick: openNew }]"
    />
  </UCard>

  <!-- Modal: form de gasto -->
  <UModal
    v-model:open="isFormOpen"
    :title="selectedExpense ? 'Editar gasto' : 'Agregar gasto'"
    description="Un gasto de la cotización que se reparte en el precio por asiento"
    class="sm:max-w-xl"
  >
    <template #body>
      <QuotationExpenseForm
        :quotation-id="quotationId"
        :expense="selectedExpense"
        @submit="handleSubmit"
        @cancel="isFormOpen = false"
      />
    </template>
  </UModal>

  <!-- Modal: confirmar eliminación -->
  <UModal
    v-model:open="isDeleteModalOpen"
    title="Eliminar gasto"
    :description="expenseToDelete ? `¿Eliminar ${expenseToDelete.category} (${formatCurrency(expenseToDelete.totalCost)})? El precio por asiento se recalcula.` : undefined"
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
