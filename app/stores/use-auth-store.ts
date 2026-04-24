import type { Session, User } from '@supabase/supabase-js';

function getSignInErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object' || !('message' in error))
    return 'No pudimos iniciar sesión. Intenta de nuevo.';

  const message = String((error as { message?: string }).message ?? '').toLowerCase();

  if (message.includes('invalid login credentials'))
    return 'Email o contraseña inválidos.';

  if (message.includes('email not confirmed'))
    return 'Debes confirmar tu email antes de iniciar sesión.';

  return String((error as { message?: string }).message) || 'No pudimos iniciar sesión. Intenta de nuevo.';
}

function getSignUpErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object' || !('message' in error))
    return 'No pudimos crear tu cuenta. Intenta de nuevo.';

  const message = String((error as { message?: string }).message ?? '').toLowerCase();

  if (message.includes('user already registered'))
    return 'Este email ya está registrado.';

  if (message.includes('password should be at least'))
    return 'La contraseña no cumple los requisitos mínimos.';

  return String((error as { message?: string }).message) || 'No pudimos crear tu cuenta. Intenta de nuevo.';
}

export const useAuthStore = defineStore('useAuthStore', () => {
  const supabase = useSupabase();

  const user = ref<User | null>(null);
  const session = ref<Session | null>(null);
  const loading = ref(false);

  const isAuthenticated = computed(() => !!session.value);
  const displayName = computed(() => user.value?.user_metadata?.name || user.value?.email || '');
  const userEmail = computed(() => user.value?.email || '');
  const avatarUrl = computed(() => user.value?.user_metadata?.avatar_url || '');

  async function fetchSession() {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Failed to get Supabase session:', error);
      user.value = null;
      session.value = null;
      return { error };
    }

    session.value = data.session;
    user.value = data.session?.user ?? null;
    return { error: null };
  }

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    loading.value = true;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error)
        return { error: getSignInErrorMessage(error) };

      session.value = data.session;
      user.value = data.user;
      return { error: null };
    }
    finally {
      loading.value = false;
    }
  }

  async function signUp(
    email: string,
    password: string,
    name?: string,
  ): Promise<{ error: string | null; requiresEmailVerification: boolean }> {
    loading.value = true;

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: name || undefined },
        },
      });

      if (error)
        return { error: getSignUpErrorMessage(error), requiresEmailVerification: false };

      const requiresEmailVerification = !data.session;
      session.value = data.session;
      user.value = data.user;
      return { error: null, requiresEmailVerification };
    }
    finally {
      loading.value = false;
    }
  }

  async function signOut() {
    loading.value = true;

    try {
      await supabase.auth.signOut();
    }
    finally {
      user.value = null;
      session.value = null;
      loading.value = false;
    }
  }

  return {
    user,
    session,
    loading,
    isAuthenticated,
    displayName,
    userEmail,
    avatarUrl,
    fetchSession,
    signIn,
    signUp,
    signOut,
  };
});
