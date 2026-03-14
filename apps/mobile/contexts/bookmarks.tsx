import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/auth';
import * as bookmarkRepository from '@/repositories/bookmarkRepository';
import { ProviderViewModel } from '@/types/provider';

const BOOKMARK_CACHE_PREFIX = 'bookmark_ids_cache_';

interface BookmarkContextType {
  /** Set of bookmarked provider IDs (for fast lookups) */
  bookmarkedIds: string[];
  /** Check if a provider is bookmarked — O(1) via Set */
  isBookmarked: (providerId: string) => boolean;
  /** Toggle bookmark on/off — optimistic UI + Firestore sync */
  toggleBookmark: (providerId: string) => Promise<boolean>;
  /** Full provider data for the Saved Providers screen */
  bookmarkedProviders: ProviderViewModel[];
  /** Fetch full provider details for all bookmarks */
  fetchBookmarkedProviders: () => Promise<void>;
  /** Whether initial bookmark IDs are loading */
  isLoading: boolean;
  /** Whether full provider details are loading */
  isLoadingProviders: boolean;
}

const BookmarkContext = createContext<BookmarkContextType | undefined>(undefined);

export function useBookmarkContext() {
  const context = useContext(BookmarkContext);
  if (!context) {
    throw new Error('useBookmarkContext must be used within a BookmarkProvider');
  }
  return context;
}

export function BookmarkProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.uid ?? null;

  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [bookmarkedProviders, setBookmarkedProviders] = useState<ProviderViewModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);

  // Build a Set for O(1) lookups — memoized on the ids array
  const bookmarkedSet = useMemo(() => new Set(bookmarkedIds), [bookmarkedIds]);

  // ─── Load bookmark IDs on auth change ────────────────────────────────
  useEffect(() => {
    if (!userId) {
      // User signed out — clear everything including cache
      setBookmarkedIds([]);
      setBookmarkedProviders([]);
      setIsLoading(false);
      // No userId available, so we can't build the key — cache was already
      // written with the previous userId's key, which is fine; it will be
      // overwritten if/when that same user logs back in.
      return;
    }

    let cancelled = false;
    const cacheKey = `${BOOKMARK_CACHE_PREFIX}${userId}`;

    const load = async () => {
      setIsLoading(true);

      // 1. Show cached data immediately (offline-first)
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached && !cancelled) {
          setBookmarkedIds(JSON.parse(cached));
        }
      } catch {
        // Cache miss is fine
      }

      // 2. Fetch fresh data from Firestore
      try {
        const ids = await bookmarkRepository.getBookmarkedIds(userId);
        if (!cancelled) {
          setBookmarkedIds(ids);
          await AsyncStorage.setItem(cacheKey, JSON.stringify(ids));
        }
      } catch (error) {
        console.error('Error loading bookmarks from Firestore:', error);
        // Cached data (if any) remains visible
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [userId]);

  // ─── O(1) bookmark check ────────────────────────────────────────────
  const isBookmarked = useCallback(
    (providerId: string) => bookmarkedSet.has(providerId),
    [bookmarkedSet]
  );

  // ─── Toggle with optimistic update ──────────────────────────────────
  const toggleBookmark = useCallback(
    async (providerId: string): Promise<boolean> => {
      if (!userId) {
        // Not authenticated — caller should handle auth gate
        return false;
      }

      const cacheKey = `${BOOKMARK_CACHE_PREFIX}${userId}`;
      const wasBookmarked = bookmarkedSet.has(providerId);

      // Optimistic: update UI immediately
      setBookmarkedIds((prev) => {
        const next = wasBookmarked
          ? prev.filter((id) => id !== providerId)
          : [providerId, ...prev]; // Newest first
        // Fire-and-forget cache update
        AsyncStorage.setItem(cacheKey, JSON.stringify(next)).catch(() => {});
        return next;
      });

      // Also update the providers list optimistically if it's loaded
      if (wasBookmarked) {
        setBookmarkedProviders((prev) =>
          prev.filter((p) => String(p.id) !== providerId)
        );
      }

      // Sync to Firestore
      try {
        if (wasBookmarked) {
          await bookmarkRepository.removeBookmark(userId, providerId);
        } else {
          await bookmarkRepository.addBookmark(userId, providerId);
        }
        return true;
      } catch (error) {
        console.error('Error toggling bookmark:', error);

        // Rollback optimistic update on failure
        setBookmarkedIds((prev) => {
          const rolledBack = wasBookmarked
            ? [providerId, ...prev]
            : prev.filter((id) => id !== providerId);
          AsyncStorage.setItem(cacheKey, JSON.stringify(rolledBack)).catch(() => {});
          return rolledBack;
        });

        return false;
      }
    },
    [userId, bookmarkedSet]
  );

  // ─── Fetch full provider details (lazy, for Saved screen) ───────────
  const fetchBookmarkedProviders = useCallback(async () => {
    if (!userId) {
      setBookmarkedProviders([]);
      return;
    }

    setIsLoadingProviders(true);
    try {
      // Pass already-loaded IDs to avoid a redundant Firestore read
      const providers = await bookmarkRepository.getBookmarkedProviders(
        userId,
        null,
        bookmarkedIds.length > 0 ? bookmarkedIds : undefined
      );
      setBookmarkedProviders(providers);
    } catch (error) {
      console.error('Error fetching bookmarked providers:', error);
    } finally {
      setIsLoadingProviders(false);
    }
  }, [userId, bookmarkedIds]);

  // ─── Context value ──────────────────────────────────────────────────
  const value = useMemo<BookmarkContextType>(
    () => ({
      bookmarkedIds,
      isBookmarked,
      toggleBookmark,
      bookmarkedProviders,
      fetchBookmarkedProviders,
      isLoading,
      isLoadingProviders,
    }),
    [bookmarkedIds, isBookmarked, toggleBookmark, bookmarkedProviders, fetchBookmarkedProviders, isLoading, isLoadingProviders]
  );

  return (
    <BookmarkContext.Provider value={value}>
      {children}
    </BookmarkContext.Provider>
  );
}

