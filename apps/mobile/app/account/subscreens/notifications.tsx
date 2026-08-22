import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, View, Switch } from 'react-native';
import { useNavigation } from 'expo-router';
import { Appearance } from 'react-native';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { useAuth } from '@/contexts/auth';
import {
  getUserNotificationSettings,
  updateNotificationTopicSetting,
} from '@/services/notifications/pushNotifications';
import { NotificationSettings, NotificationTopicKey } from '@/services/notifications/topics';
import { useTranslation } from 'react-i18next';

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation('account');
  const { user } = useAuth();
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);

  const [settings, setSettings] = useState<NotificationSettings>({
    all: true,
    messages: true,
    bookings: true,
    reminders: true,
    payments: true,
    promotions: true,
    updates: true,
  });

  useEffect(() => {
    navigation.setOptions({ title: t('notifications.title') });
  }, [navigation, t]);

  useEffect(() => {
    const userId = user?.uid;
    if (!userId) return;

    getUserNotificationSettings(userId)
      .then(setSettings)
      .catch((error) => {
        console.error('Failed to load notification settings:', error);
      });
  }, [user?.uid]);

  const toggle = async (key: NotificationTopicKey) => {
    const userId = user?.uid;
    if (!userId) return;

    const nextEnabled = key === 'all' ? !(getAllState() === 'on') : !settings[key];

    setSettings((prev) => {
      const next = { ...prev };
      if (key === 'all') {
        next.all = nextEnabled;
        next.messages = nextEnabled;
        next.bookings = nextEnabled;
        next.reminders = nextEnabled;
        next.payments = nextEnabled;
        next.promotions = nextEnabled;
        next.updates = nextEnabled;
      } else {
        next[key] = nextEnabled;
      }
      return next;
    });

    try {
      const updated = await updateNotificationTopicSetting(userId, key, nextEnabled);
      setSettings(updated);
    } catch (error) {
      console.error('Failed to update notification topic subscription:', error);
      const restored = await getUserNotificationSettings(userId);
      setSettings(restored);
    }
  };

  const getAllState = (): 'on' | 'off' | 'mixed' => {
    const activeCount = Object.entries(settings)
      .filter(([k]) => k !== 'all')
      .filter(([_, v]) => v === true).length;
    const totalCount = Object.keys(settings).length - 1;
    if (activeCount === 0) return 'off';
    if (activeCount === totalCount) return 'on';
    return 'mixed';
  };

  const allState = getAllState();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContent}>
        {/* ── Master toggle ──────────────────────────────── */}
        <View style={styles.card}>
          <TouchableOpacity style={styles.masterRow} onPress={() => toggle('all')}>
            <Ionicons
              name={
                allState === 'on'
                  ? 'notifications'
                  : allState === 'off'
                    ? 'notifications-off-outline'
                    : 'filter'
              }
              size={24}
              color={allState === 'off' ? '#666' : '#e1a100'}
              style={styles.rowIcon}
            />
            <View style={styles.rowText}>
              <ThemedText type="defaultSemiBold">{t('notifications.allTitle')}</ThemedText>
              <ThemedText style={styles.description}>
                {allState === 'on'
                  ? t('notifications.allEnabled')
                  : allState === 'off'
                    ? t('notifications.allDisabled')
                    : t('notifications.someEnabled')}
              </ThemedText>
            </View>
            {allState === 'mixed' ? (
              <View style={styles.mixedIndicator}>
                <Ionicons name="notifications" size={24} color="#0A58A5" />
              </View>
            ) : (
              <Switch
                value={allState === 'on'}
                onValueChange={() => toggle('all')}
                trackColor={{ false: colorScheme === 'dark' ? '#444' : '#d9d9d9', true: '#0A58A5' }}
                thumbColor="#fff"
              />
            )}
          </TouchableOpacity>
        </View>

        {/* ── Individual toggles ─────────────────────────── */}
        <View style={styles.card}>
          <NotificationRow
            icon="chatbubble-ellipses-outline"
            title={t('notifications.messages.title')}
            description={t('notifications.messages.description')}
            isEnabled={settings.messages}
            onToggle={() => toggle('messages')}
            colorScheme={colorScheme}
            styles={styles}
          />
          <View style={styles.divider} />
          <NotificationRow
            icon="calendar-outline"
            title={t('notifications.bookings.title')}
            description={t('notifications.bookings.description')}
            isEnabled={settings.bookings}
            onToggle={() => toggle('bookings')}
            colorScheme={colorScheme}
            styles={styles}
          />
          <View style={styles.divider} />
          <NotificationRow
            icon="alarm-outline"
            title={t('notifications.reminders.title')}
            description={t('notifications.reminders.description')}
            isEnabled={settings.reminders}
            onToggle={() => toggle('reminders')}
            colorScheme={colorScheme}
            styles={styles}
          />
          <View style={styles.divider} />
          <NotificationRow
            icon="wallet-outline"
            title={t('notifications.payments.title')}
            description={t('notifications.payments.description')}
            isEnabled={settings.payments}
            onToggle={() => toggle('payments')}
            colorScheme={colorScheme}
            styles={styles}
          />
          <View style={styles.divider} />
          <NotificationRow
            icon="gift-outline"
            title={t('notifications.promotions.title')}
            description={t('notifications.promotions.description')}
            isEnabled={settings.promotions}
            onToggle={() => toggle('promotions')}
            colorScheme={colorScheme}
            styles={styles}
          />
          <View style={styles.divider} />
          <NotificationRow
            icon="information-circle-outline"
            title={t('notifications.updates.title')}
            description={t('notifications.updates.description')}
            isEnabled={settings.updates}
            onToggle={() => toggle('updates')}
            colorScheme={colorScheme}
            styles={styles}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-component ───────────────────────────────────────────────────────────

function NotificationRow({
  icon,
  title,
  description,
  isEnabled,
  onToggle,
  colorScheme,
  styles,
}: {
  icon: string;
  title: string;
  description: string;
  isEnabled: boolean;
  onToggle: () => void;
  colorScheme: string | null | undefined;
  styles: any;
}) {
  return (
    <View style={styles.row}>
      <Ionicons
        name={icon as any}
        size={24}
        color={isEnabled ? '#e1a100' : '#666'}
        style={styles.rowIcon}
      />
      <View style={styles.rowText}>
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
        <ThemedText style={styles.description}>{description}</ThemedText>
      </View>
      <Switch
        value={isEnabled}
        onValueChange={onToggle}
        trackColor={{ false: colorScheme === 'dark' ? '#444' : '#d9d9d9', true: '#0A58A5' }}
        thumbColor="#fff"
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function createStyles(theme: any, colorScheme: 'dark' | 'light' | null | undefined) {
  const cardBg = colorScheme === 'dark' ? '#1c1c1e' : theme.background;

  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
    },
    card: {
      backgroundColor: cardBg,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginBottom: 16,
    },
    masterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
    },
    rowIcon: {
      marginRight: 16,
      width: 24,
    },
    rowText: {
      flex: 1,
    },
    description: {
      opacity: 0.6,
      fontSize: 12,
      marginTop: 2,
    },
    divider: {
      height: 0.5,
      backgroundColor: colorScheme === 'dark' ? '#444' : '#E0E0E0',
      marginLeft: 40,
    },
    mixedIndicator: {
      backgroundColor: 'rgba(10, 88, 165, 0.15)',
      borderRadius: 16,
      padding: 4,
    },
  });
}
