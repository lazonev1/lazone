export const Bookings = [
  {
    id: 1,
    providerId: 1,
    providerName: "Alex Johnson",
    serviceId: 'elec-1',
    serviceName: "Electrical Repair",
    price: "75000 CFA",
    scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
    description: "Fix living room lighting and install new switches",
    location: "123 Main St, Brighton",
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    providerId: 1,
    providerName: "Alex Johnson",
    serviceId: 'elec-2',
    serviceName: "Wiring Installation",
    price: "150000 CFA",
    scheduledDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(), // 12 days from now
    description: "New wiring installation for home office",
    location: "456 Oak Road, Brighton",
    status: "accepted",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 3,
    providerId: 2,
    providerName: "Sarah Doe",
    serviceId: 'tail-1',
    serviceName: "Dress Alteration",
    price: "25000 CFA",
    scheduledDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
    description: "Wedding dress adjustment",
    location: "789 Pine Lane, Brighton",
    status: "cancelled",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];
