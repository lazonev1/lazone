export const Providers = [
  {
    id: 1,
    name: 'Alex Johnson',
    profession: 'Electrician',
    categoryName: 'Electrician', // Matches the "Electrician" category
    remoteService: false,
    rating: 4.8,
    reviews: 150,
    bio: 'Experienced electrician specializing in household repairs and lighting.',
    avatar: require('@/assets/images/avatar-placeholder.png'),
    cover: require('@/assets/images/loginbg.png'),
    location: { latitude: 37.7749, longitude: -122.4194 }, // Example location
    distance: 10, // Distance in km
    portfolio: [
      { image: require('@/assets/images/react-logo.png'), caption: 'Wiring work' },
      { image: require('@/assets/images/splash-icon.png'), caption: 'Panel install' },
    ],
    services: [
      { name: 'Lighting Installation', price: '$75 - $150', availability: 'Book for Later' },
      { name: 'Electrical Repairs', price: '$50 - $100', availability: 'Available Now' },
    ],
    testimonials: [
      { name: 'Sarah P.', quote: 'Alex’s work was exceptional and timely. Highly recommend!' },
      { name: 'John D.', quote: 'Professional and efficient service. Will hire again.' },
    ],
    pricing: '$50 - $150',
  },
  {
    id: 2,
    name: 'Sarah Doe',
    profession: 'Tailor',
    categoryName: 'Tailor', // Matches the "Tailor" category
    remoteService: false,
    rating: 5,
    reviews: 120,
    bio: 'Expert tailor specializing in custom clothing and alterations.',
    avatar: require('@/assets/images/avatar-placeholder.png'),
    cover: require('@/assets/images/favicon.png'),
    location: { latitude: 34.0522, longitude: -118.2437 }, // Example location
    distance: 15, // Distance in km
    portfolio: [
      { image: require('@/assets/images/react-logo.png'), caption: 'Custom dress design' },
    ],
    services: [
      { name: 'Custom Clothing', price: '$100 - $300', availability: 'Book for Later' },
      { name: 'Alterations', price: '$20 - $50', availability: 'Available Now' },
    ],
    testimonials: [
      { name: 'Emily R.', quote: 'Sarah’s tailoring skills are unmatched!' },
    ],
    pricing: '$100 - $300',
  },
  {
    id: 3,
    name: 'John Fixit',
    profession: 'Plumber',
    categoryName: 'Plumber', // Matches the "Plumber" category
    remoteService: false,
    rating: 2.6,
    reviews: 90,
    bio: 'Reliable plumber for all your household needs.',
    avatar: require('@/assets/images/avatar-placeholder.png'),
    cover: require('@/assets/images/favicon.png'),
    location: { latitude: 40.7128, longitude: -74.0060 }, // Example location
    distance: 50, // Distance in km
    portfolio: [
      { image: require('@/assets/images/splash-icon.png'), caption: 'Pipe repair' },
    ],
    services: [
      { name: 'Leak Repairs', price: '$50 - $100', availability: 'Available Now' },
      { name: 'Pipe Installation', price: '$100 - $200', availability: 'Book for Later' },
    ],
    testimonials: [
      { name: 'Mark T.', quote: 'John fixed my plumbing issues quickly and efficiently.' },
    ],
    pricing: '10000 CFA - 200000 CFA',
  },
  {
    id: 4,
    name: 'Catering Co.',
    profession: 'Caterer',
    categoryName: 'Caterer', // Matches the "Caterer" category
    remoteService: false,
    rating: 3.9,
    reviews: 200,
    bio: 'Delicious catering services for all occasions.',
    avatar: require('@/assets/images/avatar-placeholder.png'),
    cover: require('@/assets/images/favicon.png'),
    location: { latitude: 41.8781, longitude: -87.6298 }, // Example location
    distance: 30, // Distance in km
    portfolio: [
      { image: require('@/assets/images/react-logo.png'), caption: 'Wedding catering' },
    ],
    services: [
      { name: 'Event Catering', price: '$500 - $2000', availability: 'Book for Later' },
      { name: 'Custom Menus', price: '$300 - $1000', availability: 'Available Now' },
    ],
    testimonials: [
      { name: 'Anna K.', quote: 'The food was amazing, and the service was top-notch!' },
    ],
    pricing: '5000 CFA - 20000 CFA',
  },
  {
    id: 5,
    name: 'Graphic Guru',
    profession: 'Designer',
    categoryName: 'Design', // Matches the "Caterer" category
    remoteService: true,
    rating: 4,
    reviews: 200,
    bio: 'Creative graphic designer specializing in branding and digital art.',
    avatar: require('@/assets/images/avatar-placeholder.png'),
    cover: require('@/assets/images/favicon.png'),
    location: { latitude: 41.8781, longitude: -87.6298 }, // Example location
    distance: 50, // Distance in km
    portfolio: [
      { image: require('@/assets/images/react-logo.png'), caption: 'Wedding catering' },
    ],
    services: [
      { name: 'Webs Designing', price: '$500 - $2000', availability: 'Book for Later' },
      { name: 'Logo Design', price: '$300 - $1000', availability: 'Available Now' },
    ],
    testimonials: [
      { name: 'Anna K.', quote: 'The design was both creative an professional' },
    ],
    pricing: '5000 CFA - 20000 CFA',
  },
];
