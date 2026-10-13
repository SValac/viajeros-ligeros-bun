// Amounts in Mexican pesos with local format: $4,500.00

export const CURRENCY_LOCALE = 'es-MX';

export const CURRENCY_FORMAT_OPTIONS: Intl.NumberFormatOptions = {
  style: 'currency',
  currency: 'MXN',
};

const currencyFormatter = new Intl.NumberFormat(CURRENCY_LOCALE, CURRENCY_FORMAT_OPTIONS);

/**
 * @param amount - Amount in pesos
 * @returns Formatted amount, e.g. `$4,500.00`
 */
export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}
