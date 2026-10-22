import type { MaybeRefOrGetter, Ref } from 'vue';

/**
 * Local copy of a list that is saved whole on every change (a travel's itinerary or services).
 * The copy updates right away and goes back to what it was if the save fails; it follows the
 * source when that changes from outside (the refetch after saving).
 * @param source - The saved list
 * @param save - Saves the whole new list; returns whether it worked (and reports the error)
 * @returns `items`, `isSaving` and the `upsert` / `patch` / `remove` changes, each resolving to
 *   whether it was saved
 */
export function useEditableList<T extends { id: string }>(
  source: MaybeRefOrGetter<T[]>,
  save: (items: T[]) => Promise<boolean>,
) {
  const items = ref([...toValue(source)]) as Ref<T[]>;
  const isSaving = shallowRef(false);

  watch(() => toValue(source), (list) => {
    items.value = [...list];
  }, { deep: true });

  async function commit(next: T[]): Promise<boolean> {
    const previous = items.value;
    items.value = next;
    isSaving.value = true;
    try {
      const saved = await save(next);
      if (!saved)
        items.value = previous;
      return saved;
    }
    finally {
      isSaving.value = false;
    }
  }

  /** Replaces the edited item, or appends a new one with a fresh id when `editing` is null. */
  function upsert(data: Omit<T, 'id'>, editing: T | null) {
    return commit(editing
      ? items.value.map(item => (item.id === editing.id ? { ...data, id: editing.id } as T : item))
      : [...items.value, { ...data, id: crypto.randomUUID() } as T]);
  }

  function patch(id: string, changes: Partial<T>) {
    return commit(items.value.map(item => (item.id === id ? { ...item, ...changes } : item)));
  }

  function remove(id: string) {
    return commit(items.value.filter(item => item.id !== id));
  }

  return { items, isSaving, upsert, patch, remove };
}
