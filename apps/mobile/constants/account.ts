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
// Labels are translated at call time, so these are builders instead of constants:
// call them during render so a language switch produces fresh labels.

import i18n from '@/localization';

export const getProfileMenuItems = (): Record<string, MenuItem[]> => ({
    /** Shown to everyone */
    general: [
        {
            id: 'saved',
            label: i18n.t('account:menu.savedBusinesses'),
            route: '/account/subscreens/savedproviders',
            icon: 'bookmark-outline',
        },
        {
            id: 'wallet',
            label: i18n.t('account:menu.paymentMethods'),
            route: '/account/subscreens/wallet',
            icon: 'wallet-outline',
        },
        {
            id: 'referral',
            label: i18n.t('account:menu.referFriend'),
            route: '/account/subscreens/refer',
            icon: 'share-social-outline',
        },
    ],

    /** Settings — shown to everyone */
    settings: [
        {
            id: 'preferences',
            label: i18n.t('account:menu.preferences'),
            route: '/account/subscreens/preferences',
            icon: 'settings-outline',
        },
        {
            id: 'notifications',
            label: i18n.t('account:menu.notificationSettings'),
            route: '/account/subscreens/notifications',
            icon: 'notifications-outline',
        },
    ],

    /** Support — shown to everyone */
    support: [
        {
            id: 'help',
            label: i18n.t('account:menu.help'),
            route: `/account/subscreens/placeholder?title=${encodeURIComponent(i18n.t('account:menu.help'))}`,
            icon: 'help-circle-outline',
        },
        {
            id: 'terms',
            label: i18n.t('account:menu.terms'),
            route: `/account/subscreens/placeholder?title=${encodeURIComponent(i18n.t('account:menu.terms'))}`,
            icon: 'document-text-outline',
        },
    ],
});

export const getWalletSettingsItems = (): Record<string, MenuItem[]> => ({
    settings: [
        {
            id: 'manage-payment',
            label: i18n.t('account:menu.managePayment'),
            route: '/manager-payment',
            icon: 'card-outline',
        },
        {
            id: 'add-payment-method',
            label: i18n.t('account:menu.addPaymentMethod'),
            route: '/add-payment',
            icon: 'add-circle-outline',
        },
        {
            id: 'security',
            label: i18n.t('account:menu.securityInfo'),
            route: '/security',
            icon: 'lock-closed-outline',
        },
    ],
});
