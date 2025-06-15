export type BookingStatus = 'confirmed' | 'pending' | 'rejected';

export interface Booking {
  id: number;
  name: string;
  service: string;
  time: string;
  status: BookingStatus;
  description?: string;
  price?: string;
  location?: string;
}
