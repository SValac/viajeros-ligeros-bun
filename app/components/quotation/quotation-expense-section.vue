<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { QuotationExpense, QuotationExpenseFormData } from '~/types/quotation';

import { useQuotationContext } from '~/composables/quotation/use-quotation-context';
import { formatCurrency } from '~/utils/currency';

type Props = {
  quotationId: string;
  readonly?: boolean;
};

const { quotationId, readonly = false } = defineProps<Props>();

const quotationStore = useQuotationStore();
const { coordinatorCount } = useQuotationContext(() => quotationId);
const toast = useToast();

const expenses = computed(() => quotationStore.getExpensesByQuotation(quotationId));
const expensesTotal = computed(() => quotationStore.getExpensesTotal(quotationId));
const totalPerSeat = computed(() => expenses.value.reduce((sum, g) => sum + getCostPerSeat(g), 0));

// What an expense adds to the price of each seat: its total over the "Dividir entre" divisor.
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

const amountClass = { th: 'text-right', td: 'text-right tabular-nums' };

const columns = computed<TableColumn<QuotationExpense>[]>(() => {
  const cols: TableColumn<QuotationExpense>[] = [
    {
      accessorKey: 'category',
      header: 'Categoría',
      cell: ({ row }) => h(resolveComponent('UBadge'), { label: row.original.category, color: 'neutral', variant: 'subtle' }),
      footer: 'Total',
    },
    {
      accessorKey: 'description',
      header: 'Descripción',
      meta: { class: { td: 'max-w-60' } },
      cell: ({ row }) => h('span', { class: ['truncate block', { 'text-muted': !row.original.description }] }, row.original.description ?? '—'),
    },
    {
      accessorKey: 'splitType',
      header: 'División',
      cell: ({ row }) => h(resolveComponent('QuotationSplitTypeBadge'), { splitType: row.original.splitType }),
    },
    {
      accessorKey: 'totalCost',
      header: 'Costo total',
      meta: { class: amountClass },
      cell: ({ row }) => {
        const expense = row.original;
        return h('div', [
          h('p', { class: 'font-medium' }, formatCurrency(expense.totalCost)),
          expense.costType === 'per_person'
            ? h('p', { class: 'text-xs text-muted whitespace-nowrap' }, `${formatCurrency(expense.unitCost ?? 0)} × ${expense.personCount} pers.`)
            : null,
        ]);
      },
      footer: () => formatCurrency(expensesTotal.value),
    },
    {
      id: 'costPerSeat',
      header: 'Por asiento',
      meta: { class: amountClass },
      cell: ({ row }) => formatCurrency(getCostPerSeat(row.original)),
      footer: () => formatCurrency(totalPerSeat.value),
    },
  ];

  if (!readonly) {
    cols.push({
      id: 'actions',
      header: () => h('span', { class: 'sr-only' }, 'Acciones'),
      meta: { class: { td: 'text-right' } },
      cell: ({ row }) => h(resolveComponent('UDropdownMenu'), {
        items: getActions(row.original),
      }, () => h(resolveComponent('UButton'), {
        'icon': 'i-lucide-ellipsis-vertical',
        'variant': 'ghost',
        'color': 'neutral',
        'size': 'sm',
        'aria-label': 'Acciones del gasto',
      })),
    });
  }

  return cols;
});
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

    <UTable
      v-if="expenses.length > 0"
      :data="expenses"
      :columns="columns"
      :ui="{ tfoot: 'font-semibold' }"
    />

    <!-- Empty state -->
    <EmptyState
      v-else
      section="expenses"
      :actions="readonly ? undefined : [{ label: 'Agregar gasto', icon: 'i-lucide-plus', onClick: openNew }]"
    />
  </UCard>

  <!-- Modal: expense form -->
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

  <!-- Modal: confirm deletion -->
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
