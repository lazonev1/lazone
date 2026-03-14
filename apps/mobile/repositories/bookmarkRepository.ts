import * as BookmarkService from "@/backend/main/src/services/bookmarkService";
import { getProviderViewModel } from "@/repositories/providerRepository";
import { ProviderViewModel } from "@/types/provider";
import { Coordinates } from "@/backend/main/src/utils/geo";

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
 * Fetches in parallel. Silently filters out providers that no longer exist.
 *
 * @param userId - The user whose bookmarks to fetch
 * @param userLocation - Optional location for distance calculation
 * @param prefetchedIds - Optional pre-fetched bookmark IDs to avoid a redundant Firestore read
 */
export async function getBookmarkedProviders(
  userId: string,
  userLocation?: Coordinates | null,
  prefetchedIds?: string[]
): Promise<ProviderViewModel[]> {
  const providerIds = prefetchedIds ?? await BookmarkService.getBookmarkedProviderIds(userId);

  if (providerIds.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(
    providerIds.map((id) => getProviderViewModel(id, userLocation))
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<ProviderViewModel | null> =>
        r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value!);
}

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


