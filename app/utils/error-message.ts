/**
 * Message of a caught error, for `error.value` or a toast. Supabase errors are `Error`s too.
 * @param e - Whatever was thrown
 * @param fallback - Text when it carries no message
 * @returns The error's message, or the fallback
 */
export function toErrorMessage(e: unknown, fallback = 'Error desconocido'): string {
  return e instanceof Error && e.message ? e.message : fallback;
}
