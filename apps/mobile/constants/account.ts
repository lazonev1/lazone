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
        route: '/account/subscreens/wallet',
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
        label: 'preview/edit portfolio',
        route: `/provider/preview?id=${MOCK_USER_PROFILE.id}`, // Add providerId
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
        route: `/provider/reviews?id=${MOCK_USER_PROFILE.id}`, // Add providerId to reviews route
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
        route: '/account/subscreens/preferences',
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
        id: 'become-provider',
        label: 'Become a Provider',
        route: '/provider/registration',
        icon: 'briefcase-outline',
        roleAccess: ['requester'],
    },
    {
        id: 'terms',
        label: 'Terms and Policies',
        route: '/terms',
        icon: 'document-text-outline',
    },
    ],

};
export const WALLET_SETTINGS_ITEMS: Record<string,  MenuItem[]> = {
    settings: [
        {
        id: 'manage-payment',
        label: 'Manage Payment Info',
        route: '/manager-payment',
        icon: 'card-outline'
    },
    {
        id: 'add-payment-method',
        label: 'Add Payment Method',
        route: '/add-payment',
        icon: 'add-circle-outline'
    },
    {
        id: 'security',
        label: 'Security Info',
        route: '/security',
        icon: 'lock-closed-outline'
    }


]}
