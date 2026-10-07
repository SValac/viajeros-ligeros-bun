// Montos en pesos mexicanos con formato local: $4,500.00

export const CURRENCY_LOCALE = 'es-MX';

export const CURRENCY_FORMAT_OPTIONS: Intl.NumberFormatOptions = {
  style: 'currency',
  currency: 'MXN',
};

const currencyFormatter = new Intl.NumberFormat(CURRENCY_LOCALE, CURRENCY_FORMAT_OPTIONS);

/**
 * @param amount - Monto en pesos
 * @returns Monto formateado, p. ej. `$4,500.00`
 */
export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}
