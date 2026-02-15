import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  EarningViewModel,
  EarningsSummary,
  EarningPeriod,
  EarningsBreakdown,
  EarningStatus,
} from '@/types/earning';
import * as earningRepository from '@/repositories/earningRepository';

export interface UseEarningsResult {
  earnings: EarningViewModel[];
  summary: EarningsSummary | null;
  breakdown: EarningsBreakdown[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  period: EarningPeriod;
  setPeriod: (period: EarningPeriod) => void;
  statusFilter: EarningStatus | 'all';
  setStatusFilter: (status: EarningStatus | 'all') => void;
  refresh: () => Promise<void>;
}

/**
 * Custom hook for managing earnings data in React components.
 *
 * Period changes trigger a re-fetch (different Firestore date range).
 * Status filtering is derived via useMemo — instant, no network call,
 * scroll position preserved.
 *
 * @param providerId - The authenticated provider's UID
 */
export function useEarnings(providerId?: string): UseEarningsResult {
  const [allEarnings, setAllEarnings] = useState<EarningViewModel[]>([]);
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [breakdown, setBreakdown] = useState<EarningsBreakdown[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [period, setPeriod] = useState<EarningPeriod>('month');
  const [statusFilter, setStatusFilter] = useState<EarningStatus | 'all'>('all');

  // Fetch data — depends on providerId and period only, never on statusFilter
  const fetchData = useCallback(
    async (showRefreshing = false) => {
      if (!providerId) return;

      if (showRefreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        // Fetch summary + earnings for the selected period
        const { summary: summaryData, earnings: periodEarnings } =
          await earningRepository.getEarningsSummary(providerId, period);

        setAllEarnings(periodEarnings);
        setSummary(summaryData);

        // Fetch monthly breakdown in parallel
        const breakdownData = await earningRepository.getMonthlyBreakdown(providerId);
        setBreakdown(breakdownData);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch earnings'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [providerId, period]
  );

  // Re-fetch when providerId or period changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derive filtered list — runs synchronously, no re-fetch
  const earnings = useMemo(
    () =>
      statusFilter === 'all'
        ? allEarnings
        : allEarnings.filter((e) => e.status === statusFilter),
    [allEarnings, statusFilter]
  );

  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);
  return {
    earnings,
    summary,
    breakdown,
    isLoading,
    isRefreshing,
    error,
    period,
    setPeriod,
    statusFilter,
    setStatusFilter,
    refresh,
  };
}
