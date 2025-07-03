export type BookingStatus = 'pending' | 'accepted' | 'completed' | 'cancelled';

export interface Booking {
  id: number;
  // Provider info (minimal)
  providerId: number;
  providerName: string;
  // Service info (essential only)
  serviceId: number;
  serviceName: string;
  price: string;
  // Scheduling
  scheduledDate: string;  // ISO date string
  // Optional details
  description?: string;
  location?: string;
  // Tracking
  status: BookingStatus;
  createdAt: string;    // ISO date string
  updatedAt?: string;   // Make it optional since pending bookings might not have it
}
// What we need to create a booking
export interface CreateBookingRequest {
  providerId: number;
  serviceId: number;
  scheduledDate: string;
  price: string;
  description?: string;
  location?: string;
}
