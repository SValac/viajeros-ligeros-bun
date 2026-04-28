/**
 * Thin wrapper around the Supabase Auth API.
 * Each function maps one Supabase auth call to a plain return value and throws on failure.
 * Error message mapping and reactive state are the store's responsibility.
 * @returns Object with all adapter methods
 */
export function useAuthAdapter() {
  const supabase = useSupabase();

  /**
   * Retrieves the current session from Supabase.
   * @returns Current session and user, or `null` values when no session exists
   * @throws {AuthError} on Supabase failure
   */
  async function getSession() {
    const { data, error } = await supabase.auth.getSession();

    if (error)
      throw error;

    return { session: data.session, user: data.session?.user ?? null };
  }

  /**
   * Signs in a user with email and password.
   * @param email - User's email address
   * @param password - User's password
   * @returns The created session and authenticated user
   * @throws {AuthError} on invalid credentials or Supabase failure
   */
  async function signInWithPassword(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error)
      throw error;

    return { session: data.session, user: data.user };
  }

  /**
   * Registers a new user with email and password.
   * @param email - New user's email address
   * @param password - New user's password
   * @param name - Optional display name stored in user metadata
   * @returns Session, user, and `requiresEmailVerification` flag (`true` when email confirmation is enabled)
   * @throws {AuthError} on duplicate email, weak password, or Supabase failure
   */
  async function signUpWithEmail(email: string, password: string, name?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: name || undefined },
      },
    });

    if (error)
      throw error;

    return { session: data.session, user: data.user, requiresEmailVerification: !data.session };
  }

  /**
   * Signs out the current user and invalidates the session.
   * Supabase sign-out errors are intentionally ignored — the local session is always cleared.
   */
  async function signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  return {
    getSession,
    signInWithPassword,
    signUpWithEmail,
    signOut,
  };
}
