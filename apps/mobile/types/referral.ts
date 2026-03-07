// ── Referral types for UI consumption ──
// No Firestore types — plain strings, numbers, and serializable objects.

export type ReferralStatus = 'signed_up' | 'completed' | 'rewarded';

export interface ReferralViewModel {
  id: string;
  referrerId: string;
  referralCode: string;
  refereeId?: string;
  refereeName?: string;
  refereeContact: string;
  status: ReferralStatus;
  rewardAmount: number;
  currency: string;
  createdAt: string;             // ISO string
}

export interface ReferralSummary {
  totalReferred: number;         // All referrals (everyone starts at signed_up)
  totalCompleted: number;
  totalRewarded: number;
  totalRewardsEarned: number;    // Sum of rewardAmount for status = 'rewarded'
  currency: string;
  referralCode: string;          // The user's own referral code
}
