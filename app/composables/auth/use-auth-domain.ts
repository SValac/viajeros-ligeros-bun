/**
 * Maps a raw Supabase sign-in error to a user-facing Spanish message.
 * Covers known Supabase Auth error codes; falls back to the raw `message` field
 * for unrecognized errors so no detail is silently swallowed.
 * @param error - Raw error thrown by the auth adapter (AuthError or unknown)
 * @returns Spanish message safe to display directly in the UI
 */
export function getSignInErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object' || !('message' in error))
    return 'No pudimos iniciar sesión. Intenta de nuevo.';

  const message = String((error as { message?: string }).message ?? '').toLowerCase();

  if (message.includes('invalid login credentials'))
    return 'Email o contraseña inválidos.';

  if (message.includes('email not confirmed'))
    return 'Debes confirmar tu email antes de iniciar sesión.';

  return String((error as { message?: string }).message) || 'No pudimos iniciar sesión. Intenta de nuevo.';
}

/**
 * Maps a raw Supabase sign-up error to a user-facing Spanish message.
 * Covers known Supabase Auth error codes; falls back to the raw `message` field
 * for unrecognized errors so no detail is silently swallowed.
 * @param error - Raw error thrown by the auth adapter (AuthError or unknown)
 * @returns Spanish message safe to display directly in the UI
 */
export function getSignUpErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object' || !('message' in error))
    return 'No pudimos crear tu cuenta. Intenta de nuevo.';

  const message = String((error as { message?: string }).message ?? '').toLowerCase();

  if (message.includes('user already registered'))
    return 'Este email ya está registrado.';

  if (message.includes('password should be at least'))
    return 'La contraseña no cumple los requisitos mínimos.';

  return String((error as { message?: string }).message) || 'No pudimos crear tu cuenta. Intenta de nuevo.';
}
