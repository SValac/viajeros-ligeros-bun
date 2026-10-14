import type { AdjustmentItem, Payment, PaymentCalculation, TravelerAccountConfig, TravelPaymentTotals } from '~/types/payment';

import { getPaymentStatus } from '~/utils/payment-status';

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
 * Computes the full financial summary for a traveler in a given travel.
 * Consolidates discount/surcharge calculation in a single place — both
 * `getTravelerPaymentSummary` and `addPayment` delegate here.
 * @param config - The traveler's account config; `undefined` if not yet configured
 * Travelers without a configured price cost 0.
 * @param travelerPayments - All payments already made by this traveler for this travel
 * @returns Calculated financial breakdown including applied price, costs, balance and status
 */
export function calculatePaymentSummary(config: TravelerAccountConfig | undefined, travelerPayments: Payment[]): PaymentCalculation {
  const travelerType = config?.travelerType ?? 'adult';
  const appliedPrice = config?.publicPriceAmount ?? (
    travelerType === 'child' && config?.childPrice != null
      ? config.childPrice
      : 0
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

/**
 * Sums each travel's per-traveler payment summaries (`calculatePaymentSummary`) into travel totals.
 * Travelers are the union of those with an account config or a payment: one who paid without a
 * config still adds to the collected amount (with a zero expected cost).
 * @param travelIds - Travels to summarize; each gets an entry, zeros if it has no configs or payments
 * @param configs - Account configs of those travels
 * @param payments - Payments of those travels
 * @returns Totals keyed by travel id. `balance` isn't clamped: overpayment makes it negative
 */
export function summarizeTravelPayments(
  travelIds: string[],
  configs: TravelerAccountConfig[],
  payments: Payment[],
): Record<string, TravelPaymentTotals> {
  const result: Record<string, TravelPaymentTotals> = {};

  for (const travelId of travelIds) {
    const travelConfigs = configs.filter(config => config.travelId === travelId);
    const travelPayments = payments.filter(payment => payment.travelId === travelId);

    const travelerIds = new Set([
      ...travelConfigs.map(travelConfig => travelConfig.travelerId),
      ...travelPayments.map(travelPayment => travelPayment.travelerId),
    ]);

    let totalExpected = 0;
    let totalCollected = 0;

    for (const travelerId of travelerIds) {
      const travelerConfig = travelConfigs.find(travelConfig => travelConfig.travelerId === travelerId);
      const travelerPayments = travelPayments.filter(travelPayment => travelPayment.travelerId === travelerId);

      const summary = calculatePaymentSummary(travelerConfig, travelerPayments);

      totalExpected += summary.finalCost;
      totalCollected += summary.totalPaid;
    }

    const balance = totalExpected - totalCollected;
    const percent = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

    result[travelId] = {
      totalExpected,
      totalCollected,
      balance,
      percent,
    };
  }

  return result;
}
