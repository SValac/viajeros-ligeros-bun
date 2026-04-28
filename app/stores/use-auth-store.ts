import type { Session, User } from '@supabase/supabase-js';

import { useAuthAdapter } from '~/composables/auth/use-auth-adapter';
import { getSignInErrorMessage, getSignUpErrorMessage } from '~/composables/auth/use-auth-domain';

export const useAuthStore = defineStore('useAuthStore', () => {
  const adapter = useAuthAdapter();

  const user = ref<User | null>(null);
  const session = ref<Session | null>(null);
  const loading = ref(false);

  const isAuthenticated = computed(() => !!session.value);
  const displayName = computed(() => user.value?.user_metadata?.name || user.value?.email || '');
  const userEmail = computed(() => user.value?.email || '');
  const avatarUrl = computed(() => user.value?.user_metadata?.avatar_url || '');

  async function fetchSession() {
    try {
      const { session: s, user: u } = await adapter.getSession();
      session.value = s;
      user.value = u;
      return { error: null };
    }
    catch (error) {
      console.error('Failed to get Supabase session:', error);
      user.value = null;
      session.value = null;
      return { error };
    }
  }

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    loading.value = true;
    try {
      const { session: s, user: u } = await adapter.signInWithPassword(email, password);
      session.value = s;
      user.value = u;
      return { error: null };
    }
    catch (error) {
      return { error: getSignInErrorMessage(error) };
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
      const { session: s, user: u, requiresEmailVerification } = await adapter.signUpWithEmail(email, password, name);
      session.value = s;
      user.value = u;
      return { error: null, requiresEmailVerification };
    }
    catch (error) {
      return { error: getSignUpErrorMessage(error), requiresEmailVerification: false };
    }
    finally {
      loading.value = false;
    }
  }

  async function signOut() {
    loading.value = true;
    try {
      await adapter.signOut();
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
