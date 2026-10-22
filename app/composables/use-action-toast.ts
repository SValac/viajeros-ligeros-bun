import { toErrorMessage } from '~/utils/error-message';

type ToastInput = Parameters<ReturnType<typeof useToast>['add']>[0];

type ActionToastMessages = {
  // Title of a green toast, or the whole toast; none = no success toast.
  success?: string | ToastInput;
  // Title of the error toast; its description is the error's message.
  error: string;
  // Description when the error carries no message.
  errorFallback?: string;
};

/**
 * Toasts for store actions, which throw an Error with a user-facing message when they fail
 * (see "Action errors" in docs/architecture/02-store.md).
 * Must be called in `setup` (it uses `useToast`).
 * @returns `runWithToast`
 */
export function useActionToast() {
  const toast = useToast();

  /**
   * Runs an action and toasts how it went:
   * `if (await runWithToast(() => store.deleteX(id), { success: 'Eliminado', error: 'No se pudo eliminar' })) close();`
   * @param action - The store action
   * @param messages - What the toasts say
   * @returns Whether it worked
   */
  async function runWithToast(action: () => Promise<unknown>, messages: ActionToastMessages): Promise<boolean> {
    try {
      await action();
    }
    catch (e) {
      toast.add({ title: messages.error, description: toErrorMessage(e, messages.errorFallback ?? 'Intenta de nuevo'), color: 'error' });
      return false;
    }
    if (messages.success)
      toast.add(typeof messages.success === 'string' ? { title: messages.success, color: 'success' } : messages.success);
    return true;
  }

  return { runWithToast };
}
