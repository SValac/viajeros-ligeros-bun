import type { MaybeRefOrGetter } from 'vue';

import { useEventListener } from '@vueuse/core';

import UnsavedChangesModal from '~/components/unsaved-changes-modal.vue';

/**
 * Asks for confirmation before leaving a form with unsaved changes: in-app navigation
 * shows a modal, and closing or reloading the browser tab shows the browser's own prompt.
 * Must be called from a component rendered inside `<NuxtPage />` (it uses
 * `onBeforeRouteLeave`).
 * @param isDirty - Whether the form has changes that are not saved yet
 */
export function useUnsavedChangesGuard(isDirty: MaybeRefOrGetter<boolean>) {
  const modal = useOverlay().create(UnsavedChangesModal);

  onBeforeRouteLeave(async () => {
    if (!toValue(isDirty))
      return true;
    // Closing the modal any other way (Esc, click outside) resolves without `true`: stay.
    return (await modal.open().result) === true;
  });

  useEventListener(window, 'beforeunload', (event) => {
    if (toValue(isDirty))
      event.preventDefault();
  });
}
