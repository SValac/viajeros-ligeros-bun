export function useAuthAdapter() {
  const supabase = useSupabase();

  async function getSession() {
    const { data, error } = await supabase.auth.getSession();

    if (error)
      throw error;

    return { session: data.session, user: data.session?.user ?? null };
  }

  async function signInWithPassword(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error)
      throw error;

    return { session: data.session, user: data.user };
  }

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
