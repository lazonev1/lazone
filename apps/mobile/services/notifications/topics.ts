export type NotificationTopicKey =
  | 'all'
  | 'messages'
  | 'bookings'
  | 'reminders'
  | 'payments'
  | 'promotions'
  | 'updates';

export type TopicToggleKey = Exclude<NotificationTopicKey, 'all'>;

export type NotificationSettings = Record<NotificationTopicKey, boolean>;

export const DEFAULT_TOPIC_SETTINGS: NotificationSettings = {
  all: true,
  messages: true,
  bookings: true,
  reminders: true,
  payments: true,
  promotions: true,
  updates: true,
};

export const TOPIC_KEYS: TopicToggleKey[] = [
  'messages',
  'bookings',
  'reminders',
  'payments',
  'promotions',
  'updates',
];

export const TOPIC_NAME_MAP: Record<TopicToggleKey, string> = {
  messages: 'app.messages',
  bookings: 'app.bookings',
  reminders: 'app.reminders',
  payments: 'app.payments',
  promotions: 'app.promotions',
  updates: 'app.updates',
};

const STORAGE_KEY_PREFIX = 'notificationSettings';

export function getNotificationSettingsStorageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}:${userId}`;
}

export function deriveMasterToggle(
  settings: Omit<NotificationSettings, 'all'>
): 'on' | 'off' | 'mixed' {
  const activeCount = TOPIC_KEYS.filter((key) => settings[key]).length;

  if (activeCount === 0) return 'off';
  if (activeCount === TOPIC_KEYS.length) return 'on';
  return 'mixed';
}

export function normalizeNotificationSettings(
  partial: Partial<NotificationSettings> | null | undefined
): NotificationSettings {
  const merged: NotificationSettings = {
    ...DEFAULT_TOPIC_SETTINGS,
    ...(partial ?? {}),
  };

  const derivedState = deriveMasterToggle({
    messages: merged.messages,
    bookings: merged.bookings,
    reminders: merged.reminders,
    payments: merged.payments,
    promotions: merged.promotions,
    updates: merged.updates,
  });

  merged.all = derivedState === 'on';
  return merged;
}
