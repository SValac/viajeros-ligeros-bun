/**
 * Open state of a create/edit modal and the record it edits (`null` = creating).
 * Screens rename what they use: `const { isOpen: isFormOpen, editing: editingBus } = useFormModal<Bus>()`.
 * @returns `isOpen`, `editing`, `openNew()`, `openEdit(item)` and `close()` (also clears `editing`)
 */
export function useFormModal<T>() {
  const isOpen = shallowRef(false);
  const editing = shallowRef<T | null>(null);

  function openNew() {
    editing.value = null;
    isOpen.value = true;
  }

  function openEdit(item: T) {
    editing.value = item;
    isOpen.value = true;
  }

  function close() {
    isOpen.value = false;
    editing.value = null;
  }

  return { isOpen, editing, openNew, openEdit, close };
}
