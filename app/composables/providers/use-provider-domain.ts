import type { Provider, ProviderFilters } from '~/types/provider';

/**
 * Filters and sorts a provider list according to the given criteria.
 * When `filters.active` is omitted, only active providers are included by default.
 * @param providers - Full provider list to filter
 * @param filters - Active filter criteria
 * @returns Filtered providers sorted by name (Spanish locale)
 */
export function filterProviders(providers: Provider[], filters: ProviderFilters): Provider[] {
  let result = [...providers];

  if (filters.active !== undefined) {
    result = result.filter(p => p.active === filters.active);
  }
  else {
    result = result.filter(p => p.active);
  }

  if (filters.category) {
    result = result.filter(p => p.category === filters.category);
  }

  if (filters.city) {
    result = result.filter(
      p => p.location.city.toLowerCase() === filters.city!.toLowerCase(),
    );
  }

  if (filters.state) {
    result = result.filter(
      p => p.location.state.toLowerCase() === filters.state!.toLowerCase(),
    );
  }

  if (filters.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    result = result.filter(
      p =>
        p.name.toLowerCase().includes(term)
        || p.description?.toLowerCase().includes(term)
        || p.contact.name?.toLowerCase().includes(term),
    );
  }

  return result.sort((a, b) => a.name.localeCompare(b.name, 'es'));
}
