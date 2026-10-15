import type { Provider, ProviderFilters, ProviderLocation } from '~/types/provider';

import { matchesSearch } from '~/utils/search';

/**
 * Formats a provider's location as a single display string.
 */
export function formatProviderLocation(location: ProviderLocation): string {
  return [location.city, location.state, location.country].join(', ');
}

/**
 * Whether a provider matches a free-text search: name, description, location
 * (city, state, country) or contact (name, phone, email). Ignores case and accents, and
 * matches phones by digits only.
 * @param provider - Provider to test
 * @param term - Text typed by the user; blank matches everything
 */
export function matchesProviderSearch(provider: Provider, term: string): boolean {
  const { location, contact } = provider;
  return matchesSearch(
    [provider.name, provider.description, location.city, location.state, location.country, contact.name, contact.email],
    term,
    contact.phone,
  );
}

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
    const term = filters.searchTerm;
    result = result.filter(p => matchesProviderSearch(p, term));
  }

  return result.sort((a, b) => a.name.localeCompare(b.name, 'es'));
}
