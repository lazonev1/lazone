import type { ProviderViewModel } from '../types/provider';
import { calculateDistance, isValidCoordinates, Coordinates } from '../backend/main/src/utils/geo';
import { isValidCfaAmount } from '../constants/Marketplace';
import english from '../localization/locales/en/explore.json';
import french from '../localization/locales/fr/explore.json';

export interface ProviderSearchFilters {
  query?: string;
  category?: string;
  city?: string;
  remoteOnly?: boolean;
  minRating?: number;
  maxPrice?: number;
  maxDistance?: number;
  userLocation?: Coordinates | null;
  excludeId?: string;
}

export function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/** "From" means at least one published service is within the budget. */
export function getStartingPrice(provider: Pick<ProviderViewModel, 'services'>): number | undefined {
  const prices = provider.services.filter(service =>
    (typeof service.price === 'string' || typeof service.price === 'number') && isValidCfaAmount(service.price))
    .map(service => Number(service.price));
  return prices.length ? Math.min(...prices) : undefined;
}

const categoryAliases = Object.entries(english.categories).map(([id, category]) => {
  const translated = french.categories[id as keyof typeof french.categories];
  return { id, terms: [id, category.name, category.description, translated.name, translated.description] };
});

/** Pure filtering shared by the repository and the catalogue-backed search UI. */
export function filterProviders(providers: ProviderViewModel[], filters: ProviderSearchFilters): ProviderViewModel[] {
  const queryWords = normalizeSearchText(filters.query ?? '').split(/\s+/).filter(Boolean);
  const city = normalizeSearchText(filters.city ?? '');
  return providers.flatMap(provider => {
    if (String(provider.id) === filters.excludeId) return [];
    if (filters.remoteOnly && !provider.remoteService) return [];
    if (filters.minRating !== undefined && provider.rating < filters.minRating) return [];
    if (filters.category && provider.categoryName !== filters.category) return [];
    if (city && !normalizeSearchText(provider.locationDetails?.city ?? '').includes(city)) return [];
    const aliases = categoryAliases.find(category => category.id === provider.categoryName)?.terms ?? [];
    const text = normalizeSearchText([
      provider.name, provider.businessName, provider.profession, provider.categoryName,
      provider.bio, ...aliases, ...provider.services.flatMap(service => [service.name, service.description]),
    ].filter(Boolean).join(' '));
    if (!queryWords.every(word => text.includes(word))) return [];
    const price = getStartingPrice(provider);
    if (filters.maxPrice !== undefined && (price === undefined || price > filters.maxPrice)) return [];
    const distance = isValidCoordinates(filters.userLocation) && isValidCoordinates(provider.location)
      ? calculateDistance(filters.userLocation!, provider.location) : undefined;
    // Remote-only searches are not restricted by physical distance. Unknown
    // coordinates never count as nearby, and filtering uses unrounded distance.
    if (!filters.remoteOnly && filters.maxDistance !== undefined
      && (distance === undefined || distance > filters.maxDistance)) return [];
    return [{ ...provider, distance }];
  }).sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name) || String(a.id).localeCompare(String(b.id)));
}
