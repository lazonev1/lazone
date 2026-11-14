import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid, Platform } from 'react-native';
import {
  AuthorizationStatus,
  deleteToken,
  getMessaging,
  getToken,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
  requestPermission,
  subscribeToTopic,
  unsubscribeFromTopic,
} from '@react-native-firebase/messaging';
import { removeUserNotificationToken, saveUserNotificationToken } from '@/repositories/notificationRepository';
import { firebaseEmulators } from '@/backend/main/src/config/firebaseEnvironment';
import {
  DEFAULT_TOPIC_SETTINGS,
  getNotificationSettingsStorageKey,
  normalizeNotificationSettings,
  NotificationSettings,
  NotificationTopicKey,
  TOPIC_KEYS,
  TOPIC_NAME_MAP,
} from './topics';

let tokenRefreshUnsubscribe: (() => void) | null = null;
let activeNotificationUserId: string | null = null;
let tokenWriteInFlight: Promise<void> | null = null;

function isPushSupported(): boolean {
  return !firebaseEmulators && (Platform.OS === 'ios' || Platform.OS === 'android');
}

async function requestAndroidNotificationPermissionIfNeeded(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  const sdkInt = typeof Platform.Version === 'number' ? Platform.Version : 0;
  if (sdkInt < 33) return true;

  const status = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
  );

  return status === PermissionsAndroid.RESULTS.GRANTED;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isPushSupported()) return false;

  const androidGranted = await requestAndroidNotificationPermissionIfNeeded();
  if (!androidGranted) return false;

  const authStatus = await requestPermission(getMessaging());

  return (
    authStatus === AuthorizationStatus.AUTHORIZED ||
    authStatus === AuthorizationStatus.PROVISIONAL
  );
}

export async function getUserNotificationSettings(
  userId: string
): Promise<NotificationSettings> {
  const key = getNotificationSettingsStorageKey(userId);
  const raw = await AsyncStorage.getItem(key);

  if (!raw) {
    return { ...DEFAULT_TOPIC_SETTINGS };
  }

  try {
    return normalizeNotificationSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_TOPIC_SETTINGS };
  }
}

async function saveUserNotificationSettings(
  userId: string,
  settings: NotificationSettings
): Promise<void> {
  const key = getNotificationSettingsStorageKey(userId);
  await AsyncStorage.setItem(key, JSON.stringify(settings));
}

async function subscribeToConfiguredTopics(settings: NotificationSettings): Promise<void> {
  const messaging = getMessaging();
  await Promise.all(
    TOPIC_KEYS.map((key) => {
      if (settings[key]) {
        return subscribeToTopic(messaging, TOPIC_NAME_MAP[key]);
      }
      return unsubscribeFromTopic(messaging, TOPIC_NAME_MAP[key]);
    })
  );
}

function setupTokenRefreshListener(userId: string) {
  tokenRefreshUnsubscribe?.();
  tokenRefreshUnsubscribe = onTokenRefresh(
    getMessaging(),
    async (token: string): Promise<void> => {
      if (activeNotificationUserId !== userId) return;
      try {
        await saveUserNotificationToken(userId, token);
      } catch (error) {
        console.warn('Failed to save refreshed FCM token:', error);
      }
    }
  );
}

export async function initializePushNotificationsForUser(userId: string): Promise<void> {
  if (!isPushSupported()) return;
  const messaging = getMessaging();

  activeNotificationUserId = userId;
  const isCurrentSession = () => activeNotificationUserId === userId;

  const permissionGranted = await requestNotificationPermission();
  if (!permissionGranted || !isCurrentSession()) return;

  await registerDeviceForRemoteMessages(messaging);
  if (!isCurrentSession()) return;

  const token = await getToken(messaging);
  if (!isCurrentSession()) return;

  const tokenWrite = saveUserNotificationToken(userId, token);
  tokenWriteInFlight = tokenWrite;
  try {
    await tokenWrite;
  } finally {
    if (tokenWriteInFlight === tokenWrite) tokenWriteInFlight = null;
  }
  if (!isCurrentSession()) return;

  const settingsKey = getNotificationSettingsStorageKey(userId);
  const alreadyConfigured = await AsyncStorage.getItem(settingsKey);

  if (!alreadyConfigured) {
    await saveUserNotificationSettings(userId, { ...DEFAULT_TOPIC_SETTINGS });
    await subscribeToConfiguredTopics(DEFAULT_TOPIC_SETTINGS);
  } else {
    const existingSettings = await getUserNotificationSettings(userId);
    await subscribeToConfiguredTopics(existingSettings);
  }

  if (isCurrentSession()) setupTokenRefreshListener(userId);
}

export function cancelPushNotificationSession(): void {
  activeNotificationUserId = null;
  tokenRefreshUnsubscribe?.();
  tokenRefreshUnsubscribe = null;
}

export async function updateNotificationTopicSetting(
  userId: string,
  key: NotificationTopicKey,
  enabled: boolean
): Promise<NotificationSettings> {
  const current = await getUserNotificationSettings(userId);
  const next: NotificationSettings = { ...current };

  if (key === 'all') {
    TOPIC_KEYS.forEach((topicKey) => {
      next[topicKey] = enabled;
    });
    next.all = enabled;
  } else {
    next[key] = enabled;
    next.all = TOPIC_KEYS.every((topicKey) => next[topicKey]);
  }

  await saveUserNotificationSettings(userId, next);
  if (!isPushSupported()) return next;
  const messaging = getMessaging();

  if (key === 'all') {
    await subscribeToConfiguredTopics(next);
  } else {
    const topic = TOPIC_NAME_MAP[key];
    if (enabled) {
      await subscribeToTopic(messaging, topic);
    } else {
      await unsubscribeFromTopic(messaging, topic);
    }
  }

  return next;
}

export async function forceDeleteLocalPushToken(): Promise<void> {
  if (!isPushSupported()) return;

  try {
    await deleteToken(getMessaging());
  } catch (error) {
    console.warn('Failed to delete local FCM token:', error);
  }
}

export async function cleanupPushNotificationsOnLogout(userId: string | null): Promise<void> {
  if (!isPushSupported()) return;

  cancelPushNotificationSession();

  // If token persistence was already underway, let it settle before removing
  // the token so a late write cannot reattach this device to the old account.
  try {
    await tokenWriteInFlight;
  } catch {
    // The cleanup below is still safe and should continue.
  }

  let token: string | null = null;

  try {
    token = await getToken(getMessaging());
  } catch {
    token = null;
  }

  if (userId && token) {
    try {
      await removeUserNotificationToken(userId, token);
    } catch (error) {
      console.warn('Failed to remove user FCM token from backend:', error);
    }
  }

  await forceDeleteLocalPushToken();
}
