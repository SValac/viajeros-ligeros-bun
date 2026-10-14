import type { TableColumn } from '@nuxt/ui';

// resolveComponent('UBadge') only works in .vue files (Nuxt rewrites it there at build time).
import { UBadge } from '#components';
import { h } from 'vue';

import type { SupplierPaymentKind } from '~/composables/quotation/use-supplier-payments';
import type { PaymentStatus } from '~/types/payment';

import { useSupplierPaymentApi } from '~/composables/quotation/use-supplier-payments';
import { formatCurrency } from '~/utils/currency';

// Label and badge color of each payment status, the same in the three tables.
const paymentStatusBadge: Record<PaymentStatus, { label: string; color: 'warning' | 'info' | 'success' }> = {
  pending: { label: 'Pendiente', color: 'warning' },
  partial: { label: 'Anticipo', color: 'info' },
  paid: { label: 'Liquidado', color: 'success' },
};

/**
 * The Pagado, Pendiente (with "Pagado de más") and Estado Pago columns of a supplier table.
 * They come back as three columns, not an array, because each table puts them in its own
 * place: provider and bus have "Método" between Pendiente and Estado Pago.
 * Call it in `<script setup>`, not inside a computed.
 * @param kind - Whose payments the columns read: quotation provider, accommodation or bus
 * @returns `paidColumn`, `pendingColumn` and `statusColumn`, typed for the table's row
 */
export function useSupplierPaymentColumns<T extends { id: string }>(kind: SupplierPaymentKind) {
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
    cell: ({ row }) => {
      const badge = paymentStatusBadge[api.status(row.original.id)];
      return h(UBadge, {
        label: badge.label,
        color: badge.color,
        variant: 'subtle',
      });
    },
  };

  return { paidColumn, pendingColumn, statusColumn };
}
