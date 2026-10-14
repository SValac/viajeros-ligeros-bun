import type { PaymentStatus } from '~/types/payment';

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
