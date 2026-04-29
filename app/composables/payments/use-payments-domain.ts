import type { AdjustmentItem, Payment, PaymentCalculation, PaymentStatus, TravelerAccountConfig } from '~/types/payment';

/**
 * Calculates the monetary value of a single discount or surcharge item.
 * @param item - The adjustment item with type and amount
 * @param base - The base price to apply the adjustment against
 * @returns The resolved adjustment amount in currency units
 */
export function calcAdjustmentAmount(item: AdjustmentItem, base: number): number {
  return item.type === 'percentage' ? base * item.amount / 100 : item.amount;
}

/**
 * Determines the payment status of a traveler based on amounts paid vs. final cost.
 * @param totalPaid - Sum of all payments made by the traveler
 * @param finalCost - The final cost after discounts and surcharges
 * @returns `'pending'` if nothing paid, `'paid'` if fully covered, `'partial'` otherwise
 */
export function getPaymentStatus(totalPaid: number, finalCost: number): PaymentStatus {
  if (totalPaid <= 0) {
    return 'pending';
  }
  else if (totalPaid >= finalCost) {
    return 'paid';
  }
  else {
    return 'partial';
  }
}

/**
 * Computes the full financial summary for a traveler in a given travel.
 * Consolidates discount/surcharge calculation in a single place — both
 * `getTravelerPaymentSummary` and `addPayment` delegate here.
 * @param config - The traveler's account config; `undefined` if not yet configured
 * @param travelPrice - The base travel price used as fallback when no override is set
 * @param travelerPayments - All payments already made by this traveler for this travel
 * @returns Calculated financial breakdown including applied price, costs, balance and status
 */
export function calculatePaymentSummary(config: TravelerAccountConfig | undefined, travelPrice: number, travelerPayments: Payment[]): PaymentCalculation {
  const travelerType = config?.travelerType ?? 'adult';
  const appliedPrice = config?.publicPriceAmount ?? (
    travelerType === 'child' && config?.childPrice != null
      ? config.childPrice
      : travelPrice
  );

  const discounts = config?.discounts ?? [];
  const surcharges = config?.surcharges ?? [];

  const totalDiscountAmount = discounts.reduce((sum, d) => sum + calcAdjustmentAmount(d, appliedPrice), 0);
  const totalSurchargeAmount = surcharges.reduce((sum, s) => sum + calcAdjustmentAmount(s, appliedPrice), 0);

  const finalCost = Math.max(0, appliedPrice - totalDiscountAmount + totalSurchargeAmount);

  const totalPaid = travelerPayments.reduce((sum, p) => sum + p.amount, 0);
  const balance = Math.max(0, finalCost - totalPaid);

  const status = getPaymentStatus(totalPaid, finalCost);

  return {
    appliedPrice,
    totalDiscountAmount,
    totalSurchargeAmount,
    finalCost,
    totalPaid,
    balance,
    status,
  };
}

/**
 * Validates that a payment amount is within the allowed range.
 * @param amount - The amount the user wants to pay
 * @param balance - The remaining balance owed by the traveler
 * @param appliedPrice - The traveler's configured price; used to skip validation when price is 0
 * @returns `null` if valid, or a user-facing error message string
 */
export function validatePaymentAmount(amount: number, balance: number, appliedPrice: number): string | null {
  if (appliedPrice > 0 && amount > balance) {
    return `El monto no puede superar el saldo pendiente (${balance}).`;
  }
  if (amount <= 0) {
    return 'El monto debe ser mayor a cero.';
  }
  return null;
}
