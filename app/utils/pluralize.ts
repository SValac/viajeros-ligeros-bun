/**
 * A count with its noun in Spanish: singular only for 1 ("1 día", "0 días", "3 coordinadores").
 * @param count - How many
 * @param singular - Noun (or noun + adjective) for one
 * @param plural - Plural when it isn't regular or has several words ("autobuses",
 *   "unidades activas"); by default adds "s" after a vowel and "es" after a consonant
 * @returns The count and the noun, e.g. `"3 noches"`
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1)
    return `${count} ${singular}`;
  return `${count} ${plural ?? (/[aeiouáéó]$/i.test(singular) ? `${singular}s` : `${singular}es`)}`;
}
