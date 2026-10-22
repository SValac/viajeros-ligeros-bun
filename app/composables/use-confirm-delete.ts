import ConfirmDeleteModal from '~/components/confirm-delete-modal.vue';

type ConfirmDeleteOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
};

/**
 * Returns a function that opens the delete confirmation modal and resolves to `true` only
 * when the user confirms. Replaces the browser's `confirm()` without changing the handler
 * flow: `if (!(await confirmDelete({ ... }))) return;`.
 * Must be called in `setup` (it uses `useOverlay`).
 */
export function useConfirmDelete() {
  const modal = useOverlay().create(ConfirmDeleteModal);

  return async (options: ConfirmDeleteOptions): Promise<boolean> => {
    return (await modal.open(options).result) === true;
  };
}
