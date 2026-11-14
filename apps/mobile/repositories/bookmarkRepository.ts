import * as BookmarkService from "@/backend/main/src/services/bookmarkService";
import { getProviderViewModel } from "@/repositories/providerRepository";
import type { ProviderViewModel } from "@/types/provider";

/**
 * Bookmark Repository — Transforms bookmark data for UI consumption
 *
 * Reads provider IDs from users/{userId}.bookmarked (string[]),
 * then fetches full ProviderViewModels for the Saved Providers screen.
 */

/**
 * Get all bookmarked provider IDs for a user.
 */
export async function getBookmarkedIds(userId: string): Promise<string[]> {
  return BookmarkService.getBookmarkedProviderIds(userId);
}

/**
 * Get full ProviderViewModel data for all bookmarked providers.
 * An unavailable listing is different from one that failed to load.
 */
export async function getBookmarkedProviders(
  providerIds: readonly string[],
): Promise<SavedProviderEntry[]> {
  return Promise.all(providerIds.map(async (id): Promise<SavedProviderEntry> => {
    try {
      const provider = await getProviderViewModel(id);
      return provider ? { id, status: 'available', provider } : { id, status: 'unavailable' };
    } catch {
      return { id, status: 'failed' };
    }
  }));
}

export type SavedProviderEntry =
  | { id: string; status: 'available'; provider: ProviderViewModel; stale?: boolean }
  | { id: string; status: 'unavailable' | 'failed' };

/**
 * Add a bookmark for a provider.
 */
export async function addBookmark(userId: string, providerId: string): Promise<void> {
  return BookmarkService.addBookmark(userId, providerId);
}

/**
 * Remove a bookmark for a provider.
 */
export async function removeBookmark(userId: string, providerId: string): Promise<void> {
  return BookmarkService.removeBookmark(userId, providerId);
}


