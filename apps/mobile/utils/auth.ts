import { Alert } from 'react-native';
import { router } from 'expo-router';
import i18n from '@/localization';

/**
 * Checks if a user is authenticated before performing an action.
 * Shows a standardised "Sign in required" alert with a redirect to login if not.
 *
 * @param userId  - The current user's UID (or undefined/null if not signed in)
 * @param message - Custom message to display (defaults to generic prompt)
 * @returns `true` if authenticated, `false` if the sign-in alert was shown
 *
 * Usage:
 *   if (!requireAuth(currentUserId, t('provider:profile.signInToSave'))) return;
 */
export function requireAuth(
  userId: string | undefined | null,
  message?: string
): boolean {
  if (userId) return true;

  Alert.alert(
    i18n.t('common:auth.signInRequiredTitle'),
    message ?? i18n.t('common:auth.signInRequiredMessage'),
    [
      { text: i18n.t('common:actions.cancel'), style: 'cancel' },
      { text: i18n.t('common:auth.signIn'), onPress: () => router.push('/(auth)/login') },
    ]
  );
  return false;
}

