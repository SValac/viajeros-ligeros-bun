const AUTH_PAGES = new Set(['/login', '/register']);

function normalizePath(path: string): string {
  if (path !== '/' && path.endsWith('/'))
    return path.slice(0, -1);

  return path;
}

export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore();
  const currentPath = normalizePath(to.path);
  const isAuthPage = AUTH_PAGES.has(currentPath);

  const { error } = await authStore.fetchSession();

  if (error) {
    console.error('Failed to get Supabase session in auth middleware:', error);

    if (isAuthPage)
      return;

    return navigateTo('/login');
  }

  if (!authStore.isAuthenticated && !isAuthPage)
    return navigateTo('/login');

  if (authStore.isAuthenticated && isAuthPage)
    return navigateTo('/');
});
