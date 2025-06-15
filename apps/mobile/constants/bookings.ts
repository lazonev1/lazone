export const Bookings = [
  {
    id: 1,
    name: 'Alex Johnson',
    service: 'Electrical Repair',
    time: '12th Oct 2023, 10:00 AM',
    status: 'confirmed',
    price: '75000 CFA',
    location: '123 Main St, Brighton',
    description: 'Fix living room lighting and install new switches',
    providerId: 1 // references provider from providers.ts
  },
  {
    id: 2,
    name: 'Brighton Electricians',
    service: 'Wiring Installation',
    time: '15th Oct 2023, 2:00 PM',
    status: 'pending',
    price: '150000 CFA',
    location: '456 Oak Road, Brighton',
    description: 'New wiring installation for home office',
    providerId: 1
  },
  {
    id: 3,
    name: 'Sarah Doe',
    service: 'Dress Alteration',
    time: '20th Oct 2023, 8:00 AM',
    status: 'rejected',
    price: '25000 CFA',
    location: '789 Pine Lane, Brighton',
    description: 'Wedding dress adjustment',
    providerId: 2
  }
];
