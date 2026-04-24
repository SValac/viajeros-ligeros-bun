const AUTH_PAGES = new Set(['/login', '/register']);

function normalizePath(path: string): string {
  if (path !== '/' && path.endsWith('/'))
    return path.slice(0, -1);

  return path;
}

export default defineNuxtRouteMiddleware(async (to) => {
  const supabase = useSupabase();
  const currentPath = normalizePath(to.path);
  const isAuthPage = AUTH_PAGES.has(currentPath);

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Failed to get Supabase session in auth middleware:', error);

    if (isAuthPage)
      return;

    return navigateTo('/login');
  }

  const isAuthenticated = Boolean(data.session);

  if (!isAuthenticated && !isAuthPage)
    return navigateTo('/login');

  if (isAuthenticated && isAuthPage)
    return navigateTo('/');
});
