import { MenuItem, UserProfile } from '@/types/user';

export const MOCK_USER_PROFILE: UserProfile = {
    id: '1',
    firstName: 'Zougrana',
    lastName: 'Haidara',
    email: 'zougrana.haidara@example.com',
    phone: '+226 70123456',
    role: 'requester',
    avatar: require('../assets/images/avatar-placeholder.png'),
    preferences: {
        notifications: true,
        emailUpdates: true,
        language: 'fr',
        currency: 'XOF',
        theme: 'system',
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
};

export const ACCOUNT_MENU_ITEMS: Record<string, MenuItem[]> = {
    requester: [
    {
        id: 'saved',
        label: 'Saved Providers',
        route: '/account/subscreens/savedproviders',
        icon: 'bookmark-outline',
    },
    {
        id: 'wallet',
        label: 'Wallet',
        route: '/wallet',
        icon: 'wallet-outline',
    },
    {
        id: 'invite',
        label: 'Invite friends',
        route: '/invite',
        icon: 'share-social-outline',
    },
    ],
    provider: [
    {
        id: 'my-portfolio',
        label: 'preview portfolio',
        route: '/my-services',
        icon: 'briefcase-outline',
    },
    {
        id: 'earnings',
        label: 'Earnings',
        route: '/earnings',
        icon: 'cash-outline',
    },
    {
        id: 'reviews',
        label: 'Reviews',
        route: '/reviews',
        icon: 'star-outline',
    },
    {
        id: 'invite',
        label: 'Invite friends',
        route: '/invite',
        icon: 'share-social-outline',
    },
    ],
    settings: [
    {
        id: 'preferences',
        label: 'Preferences',
        route: '/preferences',
        icon: 'settings-outline',
    },
    {
        id: 'account',
        label: 'Account Info',
        route: '/account/info',
        icon: 'person-outline',
    },
    ],
    resources: [
    {
        id: 'terms',
        label: 'Terms and Policies',
        route: '/terms',
        icon: 'document-text-outline',
    },
    {
        id: 'become-provider',
        label: 'Become a Provider',
        route: '/become-provider',
        icon: 'briefcase-outline',
        roleAccess: ['requester'],
    },
    ],

};
