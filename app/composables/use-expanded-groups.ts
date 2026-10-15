import type { ExpandedStateList } from '@tanstack/vue-table';

/**
 * Expanded state of a grouped `UTable`: every row with children starts expanded, and the state
 * is rebuilt when the rows change (a filter, a new traveler).
 * @param rows - The table's root rows
 * @returns The expanded state, for `v-model:expanded`
 */
export function useExpandedGroups(rows: MaybeRefOrGetter<{ id: string; children?: unknown[] }[]>) {
  const expanded = ref<ExpandedStateList>({});

  watch(() => toValue(rows), (current) => {
    expanded.value = Object.fromEntries(
      current.filter(row => row.children && row.children.length > 0).map(row => [row.id, true]),
    );
  }, { immediate: true });

  return expanded;
}
