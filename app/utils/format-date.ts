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
