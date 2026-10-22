/**
 * Replaces the part of a list that belongs to something (a travel, a quotation, a traveler)
 * with fresh rows, keeping the rest.
 * @param list - The current list
 * @param belongs - Whether an item is part of what's being replaced
 * @param items - The new rows for that part
 * @returns A new list: the items that don't belong, then `items`
 */
export function replaceWhere<T>(list: T[], belongs: (item: T) => boolean, items: T[]): T[] {
  return [...list.filter(item => !belongs(item)), ...items];
}
