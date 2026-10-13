import type { ProviderCategory } from '~/types/provider';

import { PROVIDER_CATEGORY_META } from '~/utils/provider-categories';

/**
 * The provider of a `/providers/<category>/[id]` page.
 * Goes back to the category's list if the provider doesn't exist or belongs to another
 * category, only once the catalog has loaded: before that, every provider looks missing.
 * @param category - The page's provider category
 * @returns The provider (`undefined` while loading or if missing) and the provider store
 */
export function useProviderDetail(category: ProviderCategory) {
  const route = useRoute();
  const router = useRouter();
  const providerStore = useProviderStore();

  const provider = computed(() => providerStore.getProviderById(route.params.id as string));

  watch(
    () => [providerStore.isLoaded, provider.value] as const,
    ([isLoaded, current]) => {
      if (isLoaded && current?.category !== category)
        router.replace(PROVIDER_CATEGORY_META[category].route);
    },
    { immediate: true },
  );

  return { provider, providerStore };
}
