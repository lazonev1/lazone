import { Timestamp } from 'firebase/firestore';

/**
 * Referral status lifecycle:
 *   signed_up → Invitee created an account using the referral code
 *   completed → Invitee completed their first booking/service
 *   rewarded  → Reward was credited to the referrer
 */
export type ReferralStatus = 'signed_up' | 'completed' | 'rewarded';

export interface Referral {
  _id: string;                    // Firestore document ID
  referrerId: string;             // UID of the user who sent the invite
  referralCode: string;           // The code the invitee used
  refereeId?: string;             // UID of the invitee (set after signup)
  refereeName?: string;           // Denormalized name for quick display
  refereeContact: string;         // Phone or email the invite was sent to
  status: ReferralStatus;
  rewardAmount: number;           // Reward in smallest currency unit (0 until rewarded)
  currency: string;               // e.g. 'XOF'
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
