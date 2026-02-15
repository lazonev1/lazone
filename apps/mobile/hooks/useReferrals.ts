import { useState, useEffect, useCallback } from 'react';
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
 * Follows the same pattern as useEarnings.
 *
 * @param userId - The authenticated user's UID (works for both requester and provider)
 */
export function useReferrals(userId?: string): UseReferralsResult {
  const [referrals, setReferrals] = useState<ReferralViewModel[]>([]);
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReferralStatus | 'all'>('all');

  const referralCode = userId
    ? referralRepository.generateReferralCode(userId)
    : '';

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
        const { summary: summaryData, referrals: allReferrals } =
          await referralRepository.getReferralsSummary(userId);

        // Apply client-side status filter
        const filtered =
          statusFilter === 'all'
            ? allReferrals
            : allReferrals.filter((r) => r.status === statusFilter);

        setReferrals(filtered);
        setSummary(summaryData);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch referrals'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [userId, statusFilter]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
