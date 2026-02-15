import { useState, useEffect, useCallback } from 'react';
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
 * Follows the same pattern as useProvider and useReviews.
 *
 * @param providerId - The authenticated provider's UID
 */
export function useEarnings(providerId?: string): UseEarningsResult {
  const [earnings, setEarnings] = useState<EarningViewModel[]>([]);
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [breakdown, setBreakdown] = useState<EarningsBreakdown[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [period, setPeriod] = useState<EarningPeriod>('month');
  const [statusFilter, setStatusFilter] = useState<EarningStatus | 'all'>('all');

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

        // Apply client-side status filter if needed
        const filtered =
          statusFilter === 'all'
            ? periodEarnings
            : periodEarnings.filter((e) => e.status === statusFilter);

        setEarnings(filtered);
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
    [providerId, period, statusFilter]
  );

  // Re-fetch when providerId, period, or statusFilter changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
