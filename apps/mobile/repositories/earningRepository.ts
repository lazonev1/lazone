import * as EarningService from '@/backend/main/src/services/earningService';
import { Earning as EarningModel } from '@/backend/main/src/models/Earning';
import {
  EarningViewModel,
  EarningsSummary,
  EarningStatus,
  EarningPeriod,
  EarningsBreakdown,
} from '@/types/earning';

/**
 * Earnings Repository — Transforms Firestore Earning models into UI ViewModels
 * Following the same pattern as providerRepository and messageRepository
 */

// ── Helpers ──

function toViewModel(earning: EarningModel): EarningViewModel {
  return {
    id: earning._id,
    amount: earning.amount,
    netAmount: earning.netAmount,
    platformFee: earning.platformFee,
    currency: earning.currency,
    type: earning.type,
    status: earning.status as EarningStatus,
    description: earning.description,
    serviceName: earning.serviceName,
    requesterName: earning.requesterName,
    paidAt: earning.paidAt ? earning.paidAt.toDate().toISOString() : undefined,
    createdAt: earning.createdAt?.toDate().toISOString() ?? new Date().toISOString(),
  };
}

function computeSummary(
  earnings: EarningViewModel[],
  currency: string,
  periodLabel: string
): EarningsSummary {
  let totalEarnings = 0;
  let pendingEarnings = 0;
  let paidEarnings = 0;

  for (const e of earnings) {
    if (e.status === 'completed' || e.status === 'paid') {
      totalEarnings += e.netAmount;
    }
    if (e.status === 'pending') {
      pendingEarnings += e.netAmount;
    }
    if (e.status === 'paid') {
      paidEarnings += e.netAmount;
    }
  }

  return {
    totalEarnings,
    pendingEarnings,
    paidEarnings,
    totalTransactions: earnings.length,
    currency,
    periodLabel,
  };
}

function getDateRange(period: EarningPeriod): { start: Date; end: Date; label: string } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  switch (period) {
    case 'week': {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay()); // Start of this week (Sunday)
      start.setHours(0, 0, 0, 0);
      return { start, end, label: 'This Week' };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end, label: 'This Month' };
    }
    case 'year': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start, end, label: 'This Year' };
    }
    case 'all':
    default:
      return { start: new Date(2020, 0, 1), end, label: 'All Time' };
  }
}

// ── Public API ──

/**
 * Fetch all earnings for a provider, transformed for the UI
 */
export async function getProviderEarnings(
  providerId: string,
  pageLimit?: number
): Promise<EarningViewModel[]> {
  try {
    const earnings = await EarningService.getEarningsByProviderId(providerId, pageLimit);
    return earnings.map(toViewModel);
  } catch (error) {
    console.error('Error in getProviderEarnings:', error);
    throw error;
  }
}

/**
 * Fetch earnings filtered by status
 */
export async function getProviderEarningsByStatus(
  providerId: string,
  status: EarningStatus
): Promise<EarningViewModel[]> {
  try {
    const earnings = await EarningService.getEarningsByStatus(providerId, status);
    return earnings.map(toViewModel);
  } catch (error) {
    console.error('Error in getProviderEarningsByStatus:', error);
    throw error;
  }
}

/**
 * Fetch earnings for a specific time period and compute the summary
 */
export async function getEarningsSummary(
  providerId: string,
  period: EarningPeriod = 'month',
  currency: string = 'XOF'
): Promise<{ summary: EarningsSummary; earnings: EarningViewModel[] }> {
  try {
    const { start, end, label } = getDateRange(period);
    const rawEarnings = await EarningService.getEarningsByDateRange(providerId, start, end);
    const earnings = rawEarnings.map(toViewModel);
    const summary = computeSummary(earnings, currency, label);
    return { summary, earnings };
  } catch (error) {
    console.error('Error in getEarningsSummary:', error);
    throw error;
  }
}

/**
 * Compute a monthly breakdown for a chart (last 6 months)
 */
export async function getMonthlyBreakdown(
  providerId: string
): Promise<EarningsBreakdown[]> {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const rawEarnings = await EarningService.getEarningsByDateRange(
      providerId,
      sixMonthsAgo,
      endOfMonth
    );

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Initialize buckets for last 6 months
    const buckets: EarningsBreakdown[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ label: monthNames[d.getMonth()], amount: 0 });
    }

    // Fill buckets
    for (const earning of rawEarnings) {
      if (earning.status !== 'completed' && earning.status !== 'paid') continue;
      const date = earning.createdAt.toDate();
      const monthIdx = date.getMonth();
      const bucket = buckets.find(
        (b) => b.label === monthNames[monthIdx]
      );
      if (bucket) {
        bucket.amount += earning.netAmount;
      }
    }

    return buckets;
  } catch (error) {
    console.error('Error in getMonthlyBreakdown:', error);
    throw error;
  }
}

// Note: the platform processes payouts centrally. Manual withdrawal requests
// are not supported in this flow. If you need withdrawal requests, implement
// a payout request collection and admin worker instead.
