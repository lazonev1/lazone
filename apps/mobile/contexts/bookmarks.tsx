import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/auth';
import * as repository from '@/repositories/bookmarkRepository';
import type { SavedProviderEntry } from '@/repositories/bookmarkRepository';

const EMPTY_IDS: readonly string[] = [];
const EMPTY_ENTRIES: readonly SavedProviderEntry[] = [];
const BookmarkContext = createContext<ReturnType<typeof useBookmarkState> | undefined>(undefined);

function setMembership(ids: readonly string[], id: string, saved: boolean) {
  return saved ? [id, ...ids.filter(value => value !== id)] : ids.filter(value => value !== id);
}

function useBookmarkState() {
  const { user } = useAuth();
  const { t } = useTranslation('account');
  const userId = user?.uid;
  const scope = useMemo(() => ({ userId }), [userId]);
  const activeScope = useRef<typeof scope | null>(null);
  const request = useRef(0);
  const pending = useRef(new Set<string>());
  const latestIds = useRef<{ scope: typeof scope; ids: readonly string[] } | null>(null);
  const [pendingKeys, setPendingKeys] = useState<ReadonlySet<string>>(new Set());
  type Snapshot = {
    scope: typeof scope;
    ids: readonly string[];
    entries: readonly SavedProviderEntry[];
    phase: 'loading' | 'ready' | 'failed';
  };
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  const read = useCallback(async (withProfiles: boolean) => {
    const { userId } = scope;
    if (!userId || activeScope.current !== scope) return;
    const version = ++request.current;
    const isCurrent = () => activeScope.current === scope && request.current === version;
    const cacheKey = `bookmark_ids_cache_${userId}`;
    setSnapshot(previous => ({
      scope, phase: 'loading',
      ids: previous?.scope === scope ? previous.ids : EMPTY_IDS,
      entries: previous?.scope === scope ? previous.entries : EMPTY_ENTRIES,
    }));
    if (!withProfiles) {
      try {
        const cached: unknown = JSON.parse(await AsyncStorage.getItem(cacheKey) ?? 'null');
        if (isCurrent() && Array.isArray(cached)) {
          const ids = cached.filter((id): id is string => typeof id === 'string');
          setSnapshot(previous => previous?.scope === scope ? { ...previous, ids } : previous);
        }
      } catch { /* The cache is optional; read Firestore below. */ }
    }
    try {
      const ids = await repository.getBookmarkedIds(userId);
      if (!isCurrent()) return;
      const entries = withProfiles ? await repository.getBookmarkedProviders(ids) : null;
      if (!isCurrent()) return;
      latestIds.current = { scope, ids };
      setSnapshot(previous => ({
        scope, ids, phase: 'ready',
        entries: entries?.map(entry => {
          // Preserve the last good profile when only its refresh failed.
          if (entry.status !== 'failed') return entry;
          const cached = previous?.scope === scope
            ? previous.entries.find(item => item.id === entry.id && item.status === 'available')
            : undefined;
          return cached?.status === 'available' ? { ...cached, stale: true } : entry;
        }) ?? (previous?.scope === scope ? previous.entries.filter(entry => ids.includes(entry.id)) : EMPTY_ENTRIES),
      }));
      void AsyncStorage.setItem(cacheKey, JSON.stringify(ids)).catch(() => {});
    } catch {
      if (isCurrent()) setSnapshot(previous => ({
        scope, phase: 'failed',
        ids: previous?.scope === scope ? previous.ids : EMPTY_IDS,
        entries: previous?.scope === scope ? previous.entries : EMPTY_ENTRIES,
      }));
    }
  }, [scope]);

  useEffect(() => {
    activeScope.current = scope;
    const startVersion = request.current;
    // Defer until the scope is active, including child focus effects.
    void Promise.resolve().then(() => {
      if (request.current === startVersion) void read(false);
    });
    return () => {
      activeScope.current = null;
      latestIds.current = null;
    };
  }, [scope, read]);

  const current = snapshot?.scope === scope ? snapshot : null;
  const bookmarkedIds = current?.ids ?? EMPTY_IDS;
  const bookmarkSet = useMemo(() => new Set(bookmarkedIds), [bookmarkedIds]);
  const keyFor = (id: string) => JSON.stringify([userId, id]);
  const toggleBookmark = async (id: string): Promise<boolean> => {
    if (!userId || activeScope.current !== scope || current?.phase !== 'ready') return false;
    if (!id.trim() || id.includes('/')) return false;
    const key = keyFor(id);
    const confirmed = latestIds.current;
    if (pending.current.has(key) || confirmed?.scope !== scope) return false;
    pending.current.add(key);
    setPendingKeys(new Set(pending.current));
    const save = !confirmed.ids.includes(id);
    try {
      await (save ? repository.addBookmark(userId, id) : repository.removeBookmark(userId, id));
      if (activeScope.current === scope) {
        // Do not let a refresh that began before this write restore the card.
        request.current++;
        const ids = setMembership(latestIds.current?.ids ?? confirmed.ids, id, save);
        latestIds.current = { scope, ids };
        setSnapshot(previous => previous?.scope === scope ? {
          ...previous,
          phase: 'ready',
          ids,
          entries: save ? previous.entries : previous.entries.filter(entry => entry.id !== id),
        } : previous);
        void AsyncStorage.setItem(`bookmark_ids_cache_${userId}`, JSON.stringify(ids)).catch(() => {});
      }
      return true;
    } catch {
      if (activeScope.current === scope) Alert.alert(t('saved.changeFailed'));
      return false;
    } finally {
      pending.current.delete(key);
      setPendingKeys(new Set(pending.current));
    }
  };
  const fetchBookmarkedProviders = useCallback(async () => {
    // The screen can focus before the parent scope effect is committed.
    await Promise.resolve();
    await read(true);
  }, [read]);
  const refreshBookmarkIds = useCallback(() => read(false), [read]);

  return {
    bookmarkedIds,
    isBookmarked: (id: string) => bookmarkSet.has(id),
    isBookmarkPending: (id: string) => pendingKeys.has(keyFor(id)),
    toggleBookmark,
    entries: current?.entries ?? EMPTY_ENTRIES,
    fetchBookmarkedProviders,
    refreshBookmarkIds,
    isLoading: Boolean(userId && (!current || current.phase === 'loading')),
    hasLoadError: current?.phase === 'failed',
    canChangeBookmarks: current?.phase === 'ready',
  };
}

export function useBookmarkContext() {
  const context = useContext(BookmarkContext);
  if (!context) throw new Error('useBookmarkContext must be used within a BookmarkProvider');
  return context;
}

export function BookmarkProvider({ children }: { children: ReactNode }) {
  const value = useBookmarkState();
  return <BookmarkContext.Provider value={value}>{children}</BookmarkContext.Provider>;
}
