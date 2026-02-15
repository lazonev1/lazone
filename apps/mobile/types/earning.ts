// ── Earning types for UI consumption ──
// No Firestore types — plain strings, numbers, and serializable objects.

export type EarningStatus = 'pending' | 'completed' | 'paid' | 'failed';

export type EarningType = 'service_payment' | 'tip' | 'bonus' | 'refund';

export type EarningPeriod = 'week' | 'month' | 'year' | 'all';

export interface EarningViewModel {
  id: string;
  amount: number;                // Raw amount (smallest unit)
  netAmount: number;             // After platform fee
  platformFee: number;
  currency: string;
  type: EarningType;
  status: EarningStatus;
  description: string;
  serviceName?: string;
  requesterName?: string;
  paidAt?: string;               // ISO string
  createdAt: string;             // ISO string
}

export interface EarningsSummary {
  totalEarnings: number;         // Sum of all netAmount (completed)
  pendingEarnings: number;       // Sum of netAmount where status = pending
  paidEarnings: number;          // Sum of netAmount where status = paid
  totalTransactions: number;     // Count of all earnings
  currency: string;
  periodLabel: string;           // e.g. "This Month", "This Week", "All Time"
}

export interface EarningsBreakdown {
  label: string;                 // e.g. "Jan", "Feb", "Week 1"
  amount: number;
}
