import { useBookmarkContext } from '@/contexts/bookmarks';

/**
 * Convenience hook for bookmark functionality.
 * Thin wrapper around BookmarkContext — all consumers share the same state.
 *
 * Bookmarks are stored as string[] on the User document (users/{userId}.bookmarked).
 * AsyncStorage provides offline-first caching.
 */
export function useBookmarks() {
  return useBookmarkContext();
}
