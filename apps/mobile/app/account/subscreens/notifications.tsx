import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, View, Switch } from 'react-native';
import { useNavigation } from 'expo-router';
import { Appearance } from 'react-native';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'notificationSettings';

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);

  const [settings, setSettings] = useState({
    all: true,
    messages: true,
    bookings: true,
    reminders: true,
    payments: true,
    promotions: false,
    updates: true,
  });

  useEffect(() => {
    navigation.setOptions({ title: 'Notifications' });
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  };

  const persistSettings = async (next: typeof settings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  };

  const toggle = (key: keyof typeof settings) => {
    setSettings(prev => {
      const next = { ...prev };

      if (key === 'all') {
        const activeCount = Object.entries(next)
          .filter(([k]) => k !== 'all')
          .filter(([_, v]) => v === true).length;
        const totalCount = Object.keys(next).length - 1;
        const currentState =
          activeCount === 0 ? 'off' : activeCount === totalCount ? 'on' : 'mixed';
        const newValue = currentState === 'on' ? false : true;
        Object.keys(next).forEach(k => {
          next[k as keyof typeof settings] = newValue;
        });
      } else {
        next[key] = !prev[key];
        const allOn = Object.entries(next)
          .filter(([k]) => k !== 'all')
          .every(([, v]) => v === true);
        next.all = allOn;
      }

      persistSettings(next);
      return next;
    });
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
              <ThemedText type="defaultSemiBold">All Notifications</ThemedText>
              <ThemedText style={styles.description}>
                {allState === 'on'
                  ? 'All notifications are enabled'
                  : allState === 'off'
                    ? 'All notifications are disabled'
                    : 'Some notifications are enabled'}
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
            title="New Messages"
            description="Get notified when you receive new messages"
            isEnabled={settings.messages}
            onToggle={() => toggle('messages')}
            colorScheme={colorScheme}
            styles={styles}
          />
          <View style={styles.divider} />
          <NotificationRow
            icon="calendar-outline"
            title="Booking Updates"
            description="Status changes for your bookings"
            isEnabled={settings.bookings}
            onToggle={() => toggle('bookings')}
            colorScheme={colorScheme}
            styles={styles}
          />
          <View style={styles.divider} />
          <NotificationRow
            icon="alarm-outline"
            title="Appointment Reminders"
            description="Reminders before your scheduled appointments"
            isEnabled={settings.reminders}
            onToggle={() => toggle('reminders')}
            colorScheme={colorScheme}
            styles={styles}
          />
          <View style={styles.divider} />
          <NotificationRow
            icon="wallet-outline"
            title="Payment Confirmations"
            description="Receive updates on payment status"
            isEnabled={settings.payments}
            onToggle={() => toggle('payments')}
            colorScheme={colorScheme}
            styles={styles}
          />
          <View style={styles.divider} />
          <NotificationRow
            icon="gift-outline"
            title="Offers & Promotions"
            description="News about discounts and special offers"
            isEnabled={settings.promotions}
            onToggle={() => toggle('promotions')}
            colorScheme={colorScheme}
            styles={styles}
          />
          <View style={styles.divider} />
          <NotificationRow
            icon="information-circle-outline"
            title="Service Updates"
            description="Important updates about LaZone platform"
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
