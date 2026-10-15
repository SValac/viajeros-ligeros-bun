import type { PaymentType } from '~/types/payment';

const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
};

// Select items of a payment method field (traveler and supplier payments)
export const PAYMENT_TYPE_OPTIONS: { label: string; value: PaymentType }[] = [
  { label: PAYMENT_TYPE_LABELS.cash, value: 'cash' },
  { label: PAYMENT_TYPE_LABELS.transfer, value: 'transfer' },
];

export function getPaymentTypeLabel(type: PaymentType): string {
  return PAYMENT_TYPE_LABELS[type];
}
