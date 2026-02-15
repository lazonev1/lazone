import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReferralViewModel,
  ReferralSummary,
  ReferralStatus,
} from '@/types/referral';
import * as referralRepository from '@/repositories/referralRepository';

export interface UseReferralsResult {
  referrals: ReferralViewModel[];
  summary: ReferralSummary | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  statusFilter: ReferralStatus | 'all';
  setStatusFilter: (status: ReferralStatus | 'all') => void;
  refresh: () => Promise<void>;
  createReferral: (contact: string) => Promise<string>;
  referralCode: string;
}

/**
 * Custom hook for managing referral data in React components.
 *
 * All referrals are fetched once on mount (and on pull-to-refresh).
 * Filtering is derived via useMemo — changing the status filter never
 * triggers a network request, so the switch is instant and scroll
 * position is preserved.
 *
 * @param userId - The authenticated user's UID (works for both requester and provider)
 */
export function useReferrals(userId?: string): UseReferralsResult {
  const [allReferrals, setAllReferrals] = useState<ReferralViewModel[]>([]);
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReferralStatus | 'all'>('all');

  const referralCode = userId
    ? referralRepository.generateReferralCode(userId)
    : '';

  // Fetch all referrals — only depends on userId, never on statusFilter
  const fetchData = useCallback(
    async (showRefreshing = false) => {
      if (!userId) return;

      if (showRefreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const { summary: summaryData, referrals: fetched } =
          await referralRepository.getReferralsSummary(userId);

        setAllReferrals(fetched);
        setSummary(summaryData);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch referrals'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derive filtered list — runs synchronously, no re-fetch
  const referrals = useMemo(
    () =>
      statusFilter === 'all'
        ? allReferrals
        : allReferrals.filter((r) => r.status === statusFilter),
    [allReferrals, statusFilter]
  );

  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  const createReferralFn = useCallback(
    async (contact: string): Promise<string> => {
      if (!userId) throw new Error('User not authenticated');
      const id = await referralRepository.createReferral(userId, contact);
      // Refresh to update summary + list
      await fetchData(true);
      return id;
    },
    [userId, fetchData]
  );

  return {
    referrals,
    summary,
    isLoading,
    isRefreshing,
    error,
    statusFilter,
    setStatusFilter,
    refresh,
    createReferral: createReferralFn,
    referralCode,
  };
}
