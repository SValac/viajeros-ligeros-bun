/**
 * The selected tab of a `UTabs` whose tabs change (a hotel or a bus that goes away): when the
 * selected one is no longer there, it falls back to `fallback`.
 * @param tabs - The tabs, each with its `value`
 * @param fallback - Value to select when the current one disappears (or at the start)
 * @returns The selected tab's value, for `v-model`
 */
export function useValidTab<T extends { value: string | number }>(
  tabs: MaybeRefOrGetter<T[]>,
  fallback: (tabs: T[]) => string | number,
) {
  const active = shallowRef<string | number>('');

  watch(() => toValue(tabs), (available) => {
    if (!available.some(tab => tab.value === active.value))
      active.value = fallback(available);
  }, { immediate: true });

  return active;
}
