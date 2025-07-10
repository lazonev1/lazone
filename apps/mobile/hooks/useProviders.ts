import { ServiceItem } from '@/types/provider';

export const Providers = [
  {
    id: 1,
    name: 'Alex Johnson',
    profession: 'Electrician',
    categoryName: 'Electrician',
    remoteService: false,
    rating: 4.8,
    reviews: 150,
    bio: 'Experienced electrician specializing in household repairs and lighting.',
    avatar: require('@/assets/images/avatar-placeholder.png'),
    cover: require('@/assets/images/loginbg.png'),
    location: { latitude: 37.7749, longitude: -122.4194 },
    distance: 10,
    portfolio: [
      { id: '1', image: require('@/assets/images/react-logo.png'), caption: 'Wiring work' },
      { id: '2', image: require('@/assets/images/splash-icon.png'), caption: 'Panel install' },
    ],
    services: [
      {
        id: 'elec-1',
        name: 'Lighting Installation',
        description: 'Complete lighting installation service including fixtures and wiring',
        price: '75000'
      },
      {
        id: 'elec-2',
        name: 'Electrical Repairs',
        description: 'General electrical repairs and maintenance',
        price: '50000'
      },
    ],
    testimonials: [
      { name: "Sarah P.", quote: "Alex's work was exceptional and timely. Highly recommend!" },
      { name: "John D.", quote: "Professional and efficient service. Will hire again." },
    ],
    pricing: '50000 - 150000 CFA',
  },
  {
    id: 2,
    name: 'Sarah Doe',
    profession: 'Tailor',
    categoryName: 'Tailor',
    remoteService: false,
    rating: 5,
    reviews: 120,
    bio: 'Expert tailor specializing in custom clothing and alterations.',
    avatar: require('@/assets/images/avatar-placeholder.png'),
    cover: require('@/assets/images/favicon.png'),
    location: { latitude: 34.0522, longitude: -118.2437 },
    distance: 15,
    portfolio: [
      { id: '3', image: require('@/assets/images/react-logo.png'), caption: 'Custom dress design' },
    ],
    services: [
      {
        id: 'tail-1',
        name: 'Custom Clothing',
        description: 'Made-to-measure custom clothing design and creation',
        price: '100000'
      },
      {
        id: 'tail-2',
        name: 'Alterations',
        description: 'Clothing alterations and repairs',
        price: '20000'
      },
    ],
    testimonials: [
      { name: "Emily R.", quote: "Sarah's tailoring skills are unmatched!" },
    ],
    pricing: '20000 - 100000 CFA',
  },
  {
    id: 3,
    name: 'John Fixit',
    profession: 'Plumber',
    categoryName: 'Plumber',
    remoteService: false,
    rating: 2.6,
    reviews: 90,
    bio: 'Reliable plumber for all your household needs.',
    avatar: require('@/assets/images/avatar-placeholder.png'),
    cover: require('@/assets/images/favicon.png'),
    location: { latitude: 40.7128, longitude: -74.0060 },
    distance: 50,
    portfolio: [
      { id: '4', image: require('@/assets/images/splash-icon.png'), caption: 'Pipe repair' },
    ],
    services: [
      {
        id: 'plumb-1',
        name: 'Leak Repairs',
        description: 'Fixing leaks in pipes and faucets',
        price: '50000'
      },
      {
        id: 'plumb-2',
        name: 'Pipe Installation',
        description: 'Installing new pipes and plumbing systems',
        price: '100000'
      },
    ],
    testimonials: [
      { name: "Mark T.", quote: "John fixed my plumbing issues quickly and efficiently." },
    ],
    pricing: '50000 - 100000 CFA',
  },
  {
    id: 4,
    name: 'Catering Co.',
    profession: 'Caterer',
    categoryName: 'Caterer',
    remoteService: false,
    rating: 3.9,
    reviews: 200,
    bio: 'Delicious catering services for all occasions.',
    avatar: require('@/assets/images/avatar-placeholder.png'),
    cover: require('@/assets/images/favicon.png'),
    location: { latitude: 41.8781, longitude: -87.6298 },
    distance: 30,
    portfolio: [
      { id: '5', image: require('@/assets/images/react-logo.png'), caption: 'Wedding catering' },
    ],
    services: [
      {
        id: 'cater-1',
        name: 'Event Catering',
        description: 'Full-service catering for events and parties',
        price: '500000'
      },
      {
        id: 'cater-2',
        name: 'Custom Menus',
        description: 'Creating custom menus tailored to your event',
        price: '300000'
      },
    ],
    testimonials: [
      { name: "Anna K.", quote: "The food was amazing, and the service was top-notch!" },
    ],
    pricing: '300000 - 500000 CFA',
  },
  {
    id: 5,
    name: 'Graphic Guru',
    profession: 'Designer',
    categoryName: 'Design',
    remoteService: true,
    rating: 4,
    reviews: 200,
    bio: 'Creative graphic designer specializing in branding and digital art.',
    avatar: require('@/assets/images/avatar-placeholder.png'),
    cover: require('@/assets/images/favicon.png'),
    location: { latitude: 41.8781, longitude: -87.6298 },
    distance: 50,
    portfolio: [
      { id: '6', image: require('@/assets/images/react-logo.png'), caption: 'Wedding catering' },
    ],
    services: [
      {
        id: 'design-1',
        name: 'Web Designing',
        description: 'Designing responsive and visually appealing websites',
        price: '500000'
      },
      {
        id: 'design-2',
        name: 'Logo Design',
        description: 'Creating unique and professional logos',
        price: '300000'
      },
    ],
    testimonials: [
      { name: "Anna K.", quote: "The design was both creative and professional." },
    ],
    pricing: '300000 - 500000 CFA',
  },
];
