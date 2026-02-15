import { Timestamp, DocumentReference } from 'firebase/firestore';

export type EarningStatus = 'pending' | 'completed' | 'paid' | 'failed';

export type EarningType = 'service_payment' | 'tip' | 'bonus' | 'refund';

export interface Earning {
  _id: string;                              // Firestore document ID
  providerId: string;                       // Provider's user ID (matches auth UID)
  bookingId?: DocumentReference;            // Ref to Booking (optional for bonuses)
  serviceId?: DocumentReference;            // Ref to Service
  requesterId?: DocumentReference;          // Ref to User who paid
  amount: number;                           // Amount in smallest currency unit (e.g., CFA cents)
  currency: string;                         // Currency code (e.g., 'XOF')
  type: EarningType;                        // Type of earning
  status: EarningStatus;                    // Current status
  description: string;                      // Human-readable description
  serviceName?: string;                     // Denormalized service name for quick display
  requesterName?: string;                   // Denormalized requester name for quick display
  platformFee: number;                      // Platform fee deducted (in smallest currency unit)
  netAmount: number;                        // Amount after platform fee
  paidAt?: Timestamp;                       // When the payment was completed
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
