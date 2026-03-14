import { Alert } from 'react-native';
import { router } from 'expo-router';

/**
 * Checks if a user is authenticated before performing an action.
 * Shows a standardised "Sign in required" alert with a redirect to login if not.
 *
 * @param userId  - The current user's UID (or undefined/null if not signed in)
 * @param message - Custom message to display (defaults to generic prompt)
 * @returns `true` if authenticated, `false` if the sign-in alert was shown
 *
 * Usage:
 *   if (!requireAuth(currentUserId, 'Please sign in to save providers.')) return;
 */
export function requireAuth(
  userId: string | undefined | null,
  message = 'Please sign in to continue.'
): boolean {
  if (userId) return true;

  Alert.alert(
    'Sign in required',
    message,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign In', onPress: () => router.push('/(auth)/login') },
    ]
  );
  return false;
}

