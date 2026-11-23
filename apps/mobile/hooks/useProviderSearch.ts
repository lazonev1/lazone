import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { getAllProvidersWithDetails } from '@/repositories/providerRepository';
import type { ProviderViewModel } from '@/types/provider';
import { filterProviders, ProviderSearchFilters } from '@/utils/providerSearch';

/** Fetch once per identity/explicit retry. Filter changes never trigger a full
 * Firestore scan or repeat portfolio/review population. E02 tracks server paging. */
export function useProviderSearch(filters: ProviderSearchFilters) {
  const { user } = useAuth();
  const identity = user?.uid ?? 'guest';
  const [retryVersion, setRetryVersion] = useState(0);
  const [state, setState] = useState<{
    identity: string; providers: ProviderViewModel[]; loading: boolean; error: Error | null;
  }>({ identity, providers: [], loading: true, error: null });

  useEffect(() => {
    let active = true;
    setState(previous => ({
      identity,
      providers: previous.identity === identity ? previous.providers : [],
      loading: true,
      error: null,
    }));
    void getAllProvidersWithDetails(undefined, user?.uid).then(providers => {
      if (active) setState({ identity, providers, loading: false, error: null });
    }).catch((error: unknown) => {
      if (active) setState(previous => ({
        ...previous, loading: false,
        error: error instanceof Error ? error : new Error('Provider search unavailable'),
      }));
    });
    return () => { active = false; };
  }, [identity, retryVersion, user?.uid]);

  const providers = useMemo(() => state.identity === identity
    ? filterProviders(state.providers, filters) : [], [filters, identity, state.identity, state.providers]);
  const retry = useCallback(() => setRetryVersion(version => version + 1), []);
  return {
    providers,
    isLoading: state.identity !== identity || state.loading,
    error: state.identity === identity ? state.error : null,
    retry,
  };
}
