import * as ReferralService from '@/backend/main/src/services/referralService';
import { Referral as ReferralModel } from '@/backend/main/src/models/Referral';
import {
  ReferralViewModel,
  ReferralSummary,
  ReferralStatus,
} from '@/types/referral';

/**
 * Referral Repository — Transforms Firestore Referral models into UI ViewModels
 * Following the same pattern as earningRepository and providerRepository
 */

// ── Helpers ──

function toViewModel(referral: ReferralModel): ReferralViewModel {
  return {
    id: referral._id,
    referrerId: referral.referrerId,
    referralCode: referral.referralCode,
    refereeId: referral.refereeId,
    refereeName: referral.refereeName,
    refereeContact: referral.refereeContact,
    status: referral.status as ReferralStatus,
    rewardAmount: referral.rewardAmount,
    currency: referral.currency,
    createdAt: referral.createdAt?.toDate().toISOString() ?? new Date().toISOString(),
  };
}

function computeSummary(
  referrals: ReferralViewModel[],
  referralCode: string,
  currency: string
): ReferralSummary {
  let totalCompleted = 0;
  let totalRewarded = 0;
  let totalRewardsEarned = 0;

  for (const r of referrals) {
    if (r.status === 'completed' || r.status === 'rewarded') {
      totalCompleted++;
    }
    if (r.status === 'rewarded') {
      totalRewarded++;
      totalRewardsEarned += r.rewardAmount;
    }
  }

  return {
    totalReferred: referrals.length,
    totalCompleted,
    totalRewarded,
    totalRewardsEarned,
    currency,
    referralCode,
  };
}

/**
 * Generate a deterministic referral code from a userId.
 * Format: LAZONE-<first 6 chars of UID uppercase>
 * (Unique per user since UIDs are unique)
 */
export function generateReferralCode(userId: string): string {
  return `LAZONE-${userId.substring(0, 6).toUpperCase()}`;
}

// ── Public API ──

/**
 * Fetch all referrals for a user, transformed for the UI
 */
export async function getUserReferrals(userId: string): Promise<ReferralViewModel[]> {
  try {
    const referrals = await ReferralService.getReferralsByReferrerId(userId);
    return referrals.map(toViewModel);
  } catch (error) {
    console.error('Error in getUserReferrals:', error);
    throw error;
  }
}

/**
 * Fetch referrals + compute summary
 */
export async function getReferralsSummary(
  userId: string,
  currency: string = 'XOF'
): Promise<{ summary: ReferralSummary; referrals: ReferralViewModel[] }> {
  try {
    const raw = await ReferralService.getReferralsByReferrerId(userId);
    const referrals = raw.map(toViewModel);
    const referralCode = generateReferralCode(userId);
    const summary = computeSummary(referrals, referralCode, currency);
    return { summary, referrals };
  } catch (error) {
    console.error('Error in getReferralsSummary:', error);
    throw error;
  }
}

/**
 * Create a new referral record when the user shares a referral
 */
export async function createReferral(
  userId: string,
  refereeContact: string,
  currency: string = 'XOF'
): Promise<string> {
  try {
    const referralCode = generateReferralCode(userId);
    return await ReferralService.createReferral({
      referrerId: userId,
      referralCode,
      refereeContact,
      status: 'signed_up',
      rewardAmount: 0,
      currency,
    });
  } catch (error) {
    console.error('Error in createReferral:', error);
    throw error;
  }
}
