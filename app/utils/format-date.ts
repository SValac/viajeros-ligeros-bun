const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parses a date string for display. A date-only value (`YYYY-MM-DD`, e.g. a travel's start
 * date) is read as a local calendar date: `new Date('2026-10-29')` would be UTC midnight,
 * which shows as the day before in Mexico's time zone. Timestamps are parsed as usual.
 * @param dateString - Date-only (`YYYY-MM-DD`) or ISO timestamp
 * @returns The parsed date
 */
export function parseDisplayDate(dateString: string): Date {
  const match = DATE_ONLY.exec(dateString);
  if (match)
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Date(dateString);
}

export function formatDate(dateString: string, locale: string = 'es-MX') {
  return parseDisplayDate(dateString).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Date with the short month, for table cells and headers ("5 oct 2026").
 * @param dateString - Date-only (`YYYY-MM-DD`) or ISO timestamp
 * @param locale - Locale of the month name
 * @returns The formatted date
 */
export function formatShortDate(dateString: string, locale: string = 'es-MX'): string {
  return parseDisplayDate(dateString).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * @param start - First day (`YYYY-MM-DD`)
 * @param end - Last day (`YYYY-MM-DD`)
 * @param style - `short` month ("5 oct 2026 – 9 oct 2026") or `long` ("5 de octubre de 2026 – …")
 * @returns Both dates joined by an en dash
 */
export function formatDateRange(start: string, end: string, style: 'short' | 'long' = 'short'): string {
  const format = style === 'long' ? formatDate : formatShortDate;
  return `${format(start)} – ${format(end)}`;
}

/**
 * Returns a date as a local calendar date (`YYYY-MM-DD`), the format of `<input type="date">`.
 * `toISOString()` converts to UTC first, so in Mexico's time zone it returns tomorrow's date
 * after 6 pm.
 * @param now - Date to format (defaults to the current date)
 * @returns The local date as `YYYY-MM-DD`
 */
export function todayISO(now: Date = new Date()): string {
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
