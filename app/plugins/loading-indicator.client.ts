/**
 * Ends the `<NuxtLoadingIndicator>` bar once the router commits a navigation (guards run, page JS
 * loaded). Nuxt ends it only when the deepest `<NuxtPage>` renders, and our parent pages
 * (`travels/[id]`, `quotations/[id]`, `profile`) mount their `<NuxtPage>` after their own data
 * loads, or never (a travel without a quotation): the bar would keep running. That wait already
 * shows a skeleton.
 */
export default defineNuxtPlugin((nuxtApp) => {
  useRouter().afterEach((_to, _from, failure) => {
    // A failed navigation is ended by Nuxt itself
    if (!failure)
      nuxtApp.callHook('page:loading:end');
  });
});
