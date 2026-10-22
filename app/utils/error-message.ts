// What users see for common Supabase failures in production. Anything else gets the caller's
// fallback: the raw text can name tables, columns or constraints.
const SUPABASE_ERROR_TEXTS: Record<string, string> = {
  23505: 'Ya existe un registro con esos datos.',
  23503: 'Hay datos relacionados que lo impiden: otro registro depende de este o falta uno.',
  42501: 'No tienes permiso para hacer esto.',
  PGRST301: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  PGRST303: 'Tu sesión expiró. Vuelve a iniciar sesión.',
};

const NETWORK_ERROR_TEXT = 'Sin conexión con el servidor. Revisa tu internet e intenta de nuevo.';
const NETWORK_ERROR = /failed to fetch|networkerror|load failed/i;

// Thrown by the runtime (a bug, or fetch failing), never with a message meant for users.
const BUILT_IN_ERRORS = [TypeError, RangeError, ReferenceError, SyntaxError];

type ExternalError = { message: string; code?: string };

/**
 * Whether an error carries a raw, technical message: from Supabase (PostgREST, Storage, Auth,
 * Edge Functions) or the JavaScript runtime. Our stores, domain and repositories throw plain
 * `Error`s (or their own subclasses) with a user-facing message instead.
 * @param e - Whatever was thrown
 */
export function isExternalError(e: unknown): e is ExternalError {
  if (typeof e !== 'object' || e === null || !('message' in e))
    return false;
  // A PostgREST error is a plain `{ code, message, details, hint }` object, not an `Error`.
  if ('code' in e && 'details' in e && 'hint' in e)
    return true;
  if (!(e instanceof Error))
    return false;
  // By shape, not `instanceof` on supabase-js classes: that breaks with two copies of a package.
  return e.name === 'PostgrestError'
    || e.name.startsWith('Functions')
    || '__isAuthError' in e
    || '__isStorageError' in e
    || BUILT_IN_ERRORS.some(BuiltIn => e instanceof BuiltIn);
}

/**
 * Message of a caught error, for `error.value` or a toast. Our own errors show their message.
 * Supabase and network errors show their raw text only in development; in production they
 * get a Spanish text for the common codes, or `fallback`.
 * @param e - Whatever was thrown
 * @param fallback - Text when there's no safe message to show
 * @returns The text to show the user
 */
export function toErrorMessage(e: unknown, fallback = 'Error desconocido'): string {
  if (isExternalError(e)) {
    if (import.meta.dev)
      return e.code ? `${e.message} (${e.code})` : e.message || fallback;
    if (NETWORK_ERROR.test(e.message))
      return NETWORK_ERROR_TEXT;
    return (e.code && SUPABASE_ERROR_TEXTS[e.code]) || fallback;
  }
  if (!(e instanceof Error))
    return fallback;

  // In development, also show what Supabase said behind a translated message.
  if (import.meta.dev && isExternalError(e.cause) && e.cause.message)
    return `${e.message || fallback} (${e.cause.message})`;
  return e.message || fallback;
}
