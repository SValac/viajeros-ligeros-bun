import type { RouteLocationRaw } from 'vue-router';

type RedirectIfMissingOptions = {
  /** Where to go when the record doesn't exist. */
  to: RouteLocationRaw;
  /** Error toast shown before redirecting; none when omitted. */
  toast?: { title: string; description: string };
  /** The redirect waits while it returns `false` (e.g. during a delete, or without an id). */
  active?: () => boolean;
};

/**
 * Leaves a detail page whose record doesn't exist (or RLS hides it). Only once the query
 * resolved and with a strict `null`: `undefined` is "still loading" (direct link) or "the request
 * failed", and neither means the record doesn't exist.
 * `watch` with an explicit source, not `watchEffect`: `toast.add()` reads internal reactive state
 * and the effect would retrigger in a loop (endless toast + `router.push`).
 * @param query - The detail query's `status` and `data`
 * @param query.status - Its `status`; only `'success'` can redirect
 * @param query.data - Its `data`; `null` means the record doesn't exist
 * @param options - Redirect target, optional toast and condition
 */
export function useRedirectIfMissing(
  query: { status: Ref<string>; data: Ref<unknown> },
  options: RedirectIfMissingOptions,
) {
  const router = useRouter();
  const toast = useToast();

  watch([query.status, query.data], ([status, data]) => {
    if (status !== 'success' || data !== null || (options.active && !options.active()))
      return;
    if (options.toast)
      toast.add({ ...options.toast, color: 'error' });
    router.push(options.to);
  }, { immediate: true });
}
