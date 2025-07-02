import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, View, Switch } from 'react-native';
import { Stack, useRouter, useNavigation } from 'expo-router';
import { Appearance } from 'react-native';
import { Colors } from '@/constants/Colors';
import { MenuSection } from '@/components/ui/MenuSection';
import { MenuItem } from '@/types/user';
import { BottomPopup } from '@/components/account/BottomPopup';
import { ThemedText } from '@/components/ThemedText';

export default function PreferencesScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);

  // Preference state variables
  const [notificationPopupVisible, setNotificationPopupVisible] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    all: true,
    messages: true,
    bookings: true,
    reminders: true,
    payments: true,
    promotions: false,
    updates: true
  });
  // Toggle handler for notification switches
  const toggleNotification = (key: keyof typeof notificationSettings) => {
    setNotificationSettings(prev => {
      const newSettings = { ...prev };

      // Toggling All on/off
      if (key === 'all') {
        const activeCount = Object.entries(newSettings)
          .filter(([k]) => k !== 'all')
          .filter(([_, value]) => value === true)
          .length;

        const totalCount = Object.keys(newSettings).length - 1;
        const currentState =
          activeCount === 0 ? 'off' :
            activeCount === totalCount ? 'on' :
              'mixed';

        const newValue = currentState === 'on' ? false : true;

        // Apply the new value to all settings
        Object.keys(newSettings).forEach(k => {
          newSettings[k as keyof typeof notificationSettings] = newValue;
        });

        return newSettings;
      }

      // Toggle just this one switch
      newSettings[key] = !prev[key];

      // Check if all individual settings are now ON
      const allIndividualsOn = Object.entries(newSettings)
        .filter(([k]) => k !== 'all')
        .every(([, value]) => value === true);

      if (allIndividualsOn) {
        // If all individual switches are ON, set "all" to ON
        newSettings.all = true;
      } else {
        // If any individual switch is OFF, set "all" to OFF
        newSettings.all = false;
      }

      return newSettings;
    });
  };

  const getAllNotificationsState = () => {
    const activeCount = Object.entries(notificationSettings)
      .filter(([key]) => key !== 'all')
      .filter(([_, value]) => value === true)
      .length;
    console.log("activeCount " + activeCount)

    const totalCount = Object.keys(notificationSettings).length - 1; // Exclude 'all switch'

    console.log("totalCount " + totalCount)
    if (activeCount === 0) return 'off';
    if (activeCount === totalCount) return 'on';
    return 'mixed';
  };

  useEffect(() => {
    navigation.setOptions({ title: 'Preferences' });
  }, []);

  const navigateTo = (route: string) => {
    if (route === '/preferences/notifications') {
      setNotificationPopupVisible(true);
    } else {
      router.push(route);
    }
  };

  const preferenceItems: MenuItem[] = [
    {
      id: 'notifications',
      label: 'Notifications',
      icon: 'notifications-outline',
      route: '/preferences/notifications',
    },
    {
      id: 'language',
      label: 'Language',
      icon: 'globe-outline',
      route: '/preferences/language',
    },
    {
      id: 'appearance',
      label: 'Appearance',
      icon: 'color-palette-outline',
      route: '/preferences/appearance',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: "Preferences",
          headerStyle: {
            backgroundColor: theme.background,
          },
          headerTintColor: theme.text,
        }}
      />
      <ScrollView>
        <MenuSection
          items={preferenceItems}
          onPress={navigateTo}
          styles={styles}
        />
      </ScrollView>
      <BottomPopup
        visible={notificationPopupVisible}
        onClose={() => setNotificationPopupVisible(false)}
        title="Notification Preferences"
      >
        <View style={styles.notificationContainer}>
          {/* Three-state master toggle */}
          <View style={styles.notificationRow}>
            <AllNotificationsToggle
              state={getAllNotificationsState()}
              onToggle={() => toggleNotification('all')}
              styles={styles}
            />
          </View>

          <View style={styles.divider} />

          {/* Individual notification settings */}
          <NotificationToggle
            icon="chatbubble-ellipses-outline"
            title="New Messages"
            description="Get notified when you receive new messages"
            isEnabled={notificationSettings.messages}
            onToggle={() => toggleNotification('messages')}
            indented
            styles={styles}
          />

          <View style={styles.divider} />

          <NotificationToggle
            icon="calendar-outline"
            title="Booking Updates"
            description="Status changes for your bookings"
            isEnabled={notificationSettings.bookings}
            onToggle={() => toggleNotification('bookings')}
            indented
            styles={styles}
          />

          <View style={styles.divider} />

          <NotificationToggle
            icon="alarm-outline"
            title="Appointment Reminders"
            description="Reminders before your scheduled appointments"
            isEnabled={notificationSettings.reminders}
            onToggle={() => toggleNotification('reminders')}
            indented
            styles={styles}
          />

          <View style={styles.divider} />

          <NotificationToggle
            icon="wallet-outline"
            title="Payment Confirmations"
            description="Receive updates on payment status"
            isEnabled={notificationSettings.payments}
            onToggle={() => toggleNotification('payments')}
            indented
            styles={styles}
          />

          <View style={styles.divider} />

          <NotificationToggle
            icon="gift-outline"
            title="Offers & Promotions"
            description="News about discounts and special offers"
            isEnabled={notificationSettings.promotions}
            onToggle={() => toggleNotification('promotions')}
            indented
            styles={styles}
          />

          <View style={styles.divider} />

          <NotificationToggle
            icon="information-circle-outline"
            title="Service Updates"
            description="Important updates about LaZone platform"
            isEnabled={notificationSettings.updates}
            onToggle={() => toggleNotification('updates')}
            indented
            styles={styles}
          />

          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => {
              // Save notifications state before dismissing the bottom popup
              setNotificationPopupVisible(false);
            }}
          >
            <ThemedText style={styles.saveButtonText}>Save Preferences</ThemedText>
          </TouchableOpacity>
        </View>
      </BottomPopup>
    </SafeAreaView>
  );
}
function NotificationToggle({
  icon,
  title,
  description,
  isEnabled,
  onToggle,
  indented = false,
  styles,
}: {
  icon: string;
  title: string;
  description: string;
  isEnabled: boolean;
  onToggle: () => void;
  indented?: boolean;
  styles?: any;
}) {
  const colorScheme = Appearance.getColorScheme();

  return (
    <View style={[
      styles.notificationRow,
      indented && styles.indentedRow
    ]}>
      <Ionicons
        name={icon}
        size={24}
        color={isEnabled ? "#e1a100" : "#666"}
        style={styles.notificationIcon}
      />
      <View style={styles.notificationText}>
        <ThemedText type="defaultSemiBold">
          {title}
        </ThemedText>
        <ThemedText style={styles.notificationDescription}>
          {description}
        </ThemedText>
      </View>
      <Switch
        value={isEnabled}
        onValueChange={onToggle}
        trackColor={{
          false: colorScheme === 'dark' ? '#444' : '#d9d9d9',
          true: '#0A58A5'
        }}
        thumbColor="#fff"
      />
    </View>
  );
}

function createStyles(theme: any, colorScheme: 'dark' | 'light' | null | undefined) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    section: {
      marginTop: 16,
      marginHorizontal: 16,
      marginBottom: 24,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : theme.background,
    },
    sectionWithoutTitle: {
      paddingTop: 0,
    },
    sectionTitle: {
      marginBottom: 12,
    },
    menuItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderRadius: 8,
      paddingVertical: 12,
    },
    menuItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    menuIcon: {
      marginRight: 12,
      color: theme.text,
      width: 24,
    },
    divider: {
      height: 0.5,
      backgroundColor: colorScheme === 'dark' ? '#444' : '#E0E0E0',
      marginLeft: 36,
      marginRight: 25,
    },
    notificationContainer: {
      padding: 10,
      marginBottom: 30,
    },
    notificationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 10,
    },
    indentedRow: {
      paddingLeft: 40,
    },
    notificationIcon: {
      marginRight: 16,
      marginTop: 2,
      width: 24,
    },
    notificationText: {
      flex: 1,
    },
    notificationDescription: {
      opacity: 0.7,
      fontSize: 12,
      marginTop: 2,
    },

    saveButton: {
      backgroundColor: '#0A58A5',
      padding: 14,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 20,
    },
    saveButtonText: {
      color: '#fff',
      fontWeight: '600',
    },
    allNotificationsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 10,
      padding: 5,
      borderRadius: 8,
    },
    stateIndicator: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 50,
    },
    mixedStateIndicator: {
      backgroundColor: 'rgba(10, 88, 165, 0.15)',
      borderRadius: 16,
      padding: 4,
    },
  });
}

function AllNotificationsToggle({
  state,
  onToggle,
  styles
}: {
  state: 'on' | 'off' | 'mixed',
  onToggle: () => void,
  styles: any
}) {
  const colorScheme = Appearance.getColorScheme();
  let iconName: string;
  let iconColor: string;

  switch (state) {
    case 'on':
      iconName = 'notifications';
      iconColor = "#e1a100";
      break;
    case 'off':
      iconName = 'notifications-off-outline';
      iconColor = "#666";
      break;
    case 'mixed':
      iconName = 'filter';
      iconColor = "#e1a100";
      break;
  }

  return (
    <TouchableOpacity
      style={styles.allNotificationsRow}
      onPress={onToggle}
    >
      <Ionicons
        name={iconName}
        size={24}
        color={iconColor}
        style={styles.notificationIcon}
      />
      <View style={styles.notificationText}>
        <ThemedText type="defaultSemiBold">
          All Notifications
        </ThemedText>
        <ThemedText style={styles.notificationDescription}>
          {state === 'on' ? 'All notifications are enabled' :
            state === 'off' ? 'All notifications are disabled' :
              'Turn on All Notifications'}
        </ThemedText>
      </View>

      {/* Visual indicator for the three states */}
      <View style={styles.stateIndicator}>
        {state === 'mixed' ? (
          <View style={styles.mixedStateIndicator}>
            <Ionicons name="notifications" size={24} color="#0A58A5" />
          </View>
        ) : (
          <Switch
            value={state === 'on'}
            onValueChange={onToggle}
            trackColor={{
              false: colorScheme === 'dark' ? '#444' : '#d9d9d9',
              true: '#0A58A5'
            }}
            thumbColor="#fff"
          />
        )}
      </View>
    </TouchableOpacity>
  );
}