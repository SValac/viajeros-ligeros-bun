import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';

// resolveComponent() only works in .vue files (Nuxt rewrites it there at build time).
import { PaymentStatusBadge, UBadge } from '#components';
import { h } from 'vue';

import type { SupplierPaymentKind } from '~/composables/quotation/use-supplier-payments';
import type { PaymentType } from '~/types/payment';

import { useSupplierPaymentApi } from '~/composables/quotation/use-supplier-payments';
import { formatCurrency } from '~/utils/currency';
import { getPaymentTypeLabel } from '~/utils/payment-type';

type SupplierRow = { id: string; confirmed: boolean };

/**
 * The pieces the quotation provider, accommodation and bus tables share: the Pagado, Pendiente
 * (with "Pagado de más"), Estado Pago and Confirmado columns, and the payment and confirm
 * items of the row menu.
 * The columns come back one by one, not as an array, because each table puts them in its own
 * place: provider and bus have "Método" between Pendiente and Estado Pago.
 * Call it in `<script setup>`, not inside a computed.
 * @param kind - Whose payments the table reads: quotation provider, accommodation or bus
 * @returns The columns and menu item builders, typed for the table's row
 */
export function useSupplierTable<T extends SupplierRow>(kind: SupplierPaymentKind) {
  const api = useSupplierPaymentApi(kind);

  const paidColumn: TableColumn<T> = {
    id: 'paid',
    header: 'Pagado',
    cell: ({ row }) => formatCurrency(api.paid(row.original.id)),
  };

  const pendingColumn: TableColumn<T> = {
    id: 'pending',
    header: 'Pendiente',
    cell: ({ row }) => {
      const balance = api.pendingBalance(row.original.id);
      const overpayment = api.overpayment(row.original.id);
      return h('div', [
        h('span', { class: balance > 0 ? 'text-warning' : 'text-success' }, formatCurrency(balance)),
        overpayment > 0
          ? h('p', { class: 'text-xs text-error whitespace-nowrap' }, `Pagado de más: ${formatCurrency(overpayment)}`)
          : null,
      ]);
    },
  };

  const statusColumn: TableColumn<T> = {
    id: 'paymentStatus',
    header: 'Estado Pago',
    cell: ({ row }) => h(PaymentStatusBadge, { status: api.status(row.original.id), party: 'supplier' }),
  };

  const confirmedColumn: TableColumn<T> = {
    id: 'confirmed',
    header: 'Confirmado',
    cell: ({ row }) => h(UBadge, {
      label: row.original.confirmed ? 'Sí' : 'No',
      color: row.original.confirmed ? 'success' : 'neutral',
      variant: 'subtle',
    }),
  };

  /**
   * "Ver historial de pagos" and "Registrar pago" (disabled once nothing is pending). Both open
   * the history, where the payment form lives. They stay on a confirmed quotation: payments go
   * on after it, only its structure is locked.
   */
  function paymentActions(item: T, openHistory: (item: T) => void): DropdownMenuItem[] {
    return [
      { label: 'Ver historial de pagos', icon: 'i-lucide-receipt', onSelect: () => openHistory(item) },
      {
        label: 'Registrar pago',
        icon: 'i-lucide-banknote',
        disabled: api.pendingBalance(item.id) <= 0,
        onSelect: () => openHistory(item),
      },
    ];
  }

  /** "Marcar como confirmado" / "Marcar sin confirmar", by the row's current state. */
  function confirmAction(item: T, toggle: (item: T) => void): DropdownMenuItem {
    return {
      label: item.confirmed ? 'Marcar sin confirmar' : 'Marcar como confirmado',
      icon: item.confirmed ? 'i-lucide-x-circle' : 'i-lucide-check-circle',
      onSelect: () => toggle(item),
    };
  }

  return { paidColumn, pendingColumn, statusColumn, confirmedColumn, paymentActions, confirmAction };
}

/**
 * The "Método" column of the provider and bus tables: how the supplier is paid.
 * @returns A column typed for the table's row
 */
export function paymentMethodColumn<T extends { paymentMethod: PaymentType }>(): TableColumn<T> {
  return {
    accessorKey: 'paymentMethod',
    header: 'Método',
    cell: ({ row }) => h(UBadge, {
      label: getPaymentTypeLabel(row.original.paymentMethod),
      color: 'neutral',
      variant: 'subtle',
    }),
  };
}
