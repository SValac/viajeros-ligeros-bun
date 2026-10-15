import type { PaymentStatus } from '~/types/payment';

/** Who is paid: a traveler pays the agency, the agency pays a quotation supplier. */
export type PaymentParty = 'traveler' | 'supplier';

export type PaymentStatusColor = 'warning' | 'info' | 'success';

export const PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'partial', 'paid'];

const PAYMENT_STATUS_COLORS: Record<PaymentStatus, PaymentStatusColor> = {
  pending: 'warning',
  partial: 'info',
  paid: 'success',
};

// A traveler pays in installments; a supplier gets a deposit and is then settled.
const PAYMENT_STATUS_LABELS: Record<PaymentParty, Record<PaymentStatus, string>> = {
  traveler: { pending: 'Pendiente', partial: 'Abono parcial', paid: 'Pagado' },
  supplier: { pending: 'Pendiente', partial: 'Anticipo', paid: 'Liquidado' },
};

/**
 * Derives the payment status of anything with a total cost from the amount paid: a traveler's
 * account or a quotation supplier (provider, accommodation, bus).
 * @param paid - Total amount already paid
 * @param total - Full cost to cover (a traveler's final cost, a supplier's payable cost)
 * @returns `'pending'` if nothing has been paid, `'paid'` if fully covered, `'partial'` otherwise
 */
export function getPaymentStatus(paid: number, total: number): PaymentStatus {
  if (paid <= 0)
    return 'pending';

  if (paid >= total)
    return 'paid';

  return 'partial';
}

export function getPaymentStatusColor(status: PaymentStatus): PaymentStatusColor {
  return PAYMENT_STATUS_COLORS[status];
}

export function getPaymentStatusLabel(status: PaymentStatus, party: PaymentParty): string {
  return PAYMENT_STATUS_LABELS[party][status];
}

/**
 * @param party - Whose payments the filter reads
 * @returns Select items for a status filter, with "Todos" first
 */
export function getPaymentStatusFilterOptions(party: PaymentParty): { label: string; value: PaymentStatus | 'all' }[] {
  return [
    { label: 'Todos', value: 'all' },
    ...PAYMENT_STATUSES.map(status => ({ label: getPaymentStatusLabel(status, party), value: status })),
  ];
}
