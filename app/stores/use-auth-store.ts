import type { Session, User } from '@supabase/supabase-js';

import { useAuthAdapter } from '~/composables/auth/use-auth-adapter';
import { getSignInErrorMessage, getSignUpErrorMessage } from '~/composables/auth/use-auth-domain';

/**
 * Global authentication state manager.
 * Delegates all Supabase Auth I/O to `useAuthAdapter` and error mapping to `use-auth-domain`.
 * Returns result objects (`{ error }`) instead of throwing so the UI can handle errors inline.
 * @returns Store state, getters and actions
 */
export const useAuthStore = defineStore('useAuthStore', () => {
  const adapter = useAuthAdapter();

  const user = ref<User | null>(null);
  const session = ref<Session | null>(null);
  const loading = ref(false);

  const isAuthenticated = computed(() => !!session.value);
  const displayName = computed(() => user.value?.user_metadata?.name || user.value?.email || '');
  const userEmail = computed(() => user.value?.email || '');
  const avatarUrl = computed(() => user.value?.user_metadata?.avatar_url || '');

  /**
   * Loads the current Supabase session into the store on app mount.
   * Failures are caught and returned as `{ error }` so the caller can decide how to react.
   * @returns `{ error: null }` on success or `{ error }` with the raw error on failure
   */
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

  /**
   * Signs in a user with email and password and updates session state.
   * @param email - User's email address
   * @param password - User's password
   * @returns `{ error: null }` on success or `{ error: string }` with a user-facing message on failure
   */
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

  /**
   * Registers a new user and updates session state if auto-confirmation is enabled.
   * @param email - New user's email address
   * @param password - New user's password
   * @param name - Optional display name stored in user metadata
   * @returns `{ error: null, requiresEmailVerification }` on success or `{ error: string }` on failure
   */
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

  /**
   * Signs out the current user and clears all session state.
   * Always clears local state even if the Supabase call fails.
   */
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
