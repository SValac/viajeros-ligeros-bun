// Lowercase without accents, so "montana" finds "Montaña".
function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Whether a record matches a free-text search over some of its fields. Ignores case and accents.
 * A phone is shown formatted ("(812) 123 4567") but stored as E.164, so it's compared by digits
 * only, from 3 of them on, however it was typed.
 * @param fields - Texts to search in; empty ones are skipped
 * @param term - Text typed by the user; blank matches everything
 * @param phone - The record's phone, if it has one
 * @returns Whether any field contains the term
 */
export function matchesSearch(fields: (string | null | undefined)[], term: string, phone?: string | null): boolean {
  const needle = normalizeSearch(term.trim());
  if (!needle)
    return true;

  if (fields.some(field => !!field && normalizeSearch(field).includes(needle)))
    return true;

  const digits = term.replace(/\D/g, '');
  return digits.length >= 3 && !!phone && phone.replace(/\D/g, '').includes(digits);
}
