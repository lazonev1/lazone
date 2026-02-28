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

// ── Unified Profile menu items (no role separation) ──────────────────────────
// Role-conditional items use the `roleAccess` field and are filtered at render time.

export const PROFILE_MENU_ITEMS: Record<string, MenuItem[]> = {
    /** Shown to everyone */
    general: [
        {
            id: 'saved',
            label: 'Saved Businesses',
            route: '/account/subscreens/savedproviders',
            icon: 'bookmark-outline',
        },
        {
            id: 'wallet',
            label: 'Payment Methods',
            route: '/account/subscreens/wallet',
            icon: 'wallet-outline',
        },
        {
            id: 'invite',
            label: 'Invite Friends',
            route: '/account/subscreens/placeholder?title=Invite%20Friends',
            icon: 'share-social-outline',
        },
    ],

    /** Settings — shown to everyone */
    settings: [
        {
            id: 'preferences',
            label: 'Preferences',
            route: '/account/subscreens/preferences',
            icon: 'settings-outline',
        },
        {
            id: 'notifications',
            label: 'Notification Settings',
            route: '/account/subscreens/notifications',
            icon: 'notifications-outline',
        },
    ],

    /** Support — shown to everyone */
    support: [
        {
            id: 'help',
            label: 'Help & Support',
            route: '/account/subscreens/placeholder?title=Help%20%26%20Support',
            icon: 'help-circle-outline',
        },
        {
            id: 'terms',
            label: 'Terms and Policies',
            route: '/account/subscreens/placeholder?title=Terms%20and%20Policies',
            icon: 'document-text-outline',
        },
    ],
};

// Keep the old export name as an alias so nothing else breaks during migration.
export const ACCOUNT_MENU_ITEMS = PROFILE_MENU_ITEMS;
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
