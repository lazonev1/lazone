import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, View, Switch, Text } from 'react-native';
import { Stack, useRouter, useNavigation } from 'expo-router';
import { Appearance } from 'react-native';
import { Colors } from '@/constants/Colors';
import { MenuSection } from '@/components/ui/MenuSection';
import { MenuItem } from '@/types/user';
import { BottomPopup } from '@/components/account/BottomPopup';
import { ThemedText } from '@/components/ThemedText';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PreferencesScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);

  // Notifications Preference state variables
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
  // Language setting state
  const [languagePopupVisible, setLanguagePopupVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'fr'>('en');
  // Appearance state variables
  const [appearancePopupVisible, setAppearancePopupVisible] = useState(false);
  const [selectedAppearance, setSelectedAppearance] = useState<'light' | 'dark' | 'system'>('system');

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
    // The actual loading of the language
    // should happen somewhere else, before the app even launches at all
    // This is just to set what the user will see in preferences.
    const loadLanguage = async () => {
      try {
        const storedLanguage = await AsyncStorage.getItem('userLanguage');
        if (storedLanguage === 'en' || storedLanguage === 'fr') {
          setSelectedLanguage(storedLanguage);
        }
      } catch (error) {
        console.error('Failed to load language preference:', error);
      }
    };

    loadLanguage();
    const loadAppearance = async () => {
      try {
        const storedAppearance = await AsyncStorage.getItem('userAppearance');
        if (storedAppearance === 'light' || storedAppearance === 'dark' || storedAppearance === 'system') {
          setSelectedAppearance(storedAppearance);
        }
      } catch (error) {
        console.error('Failed to load appearance preference:', error);
      }
    };

    loadAppearance();
  }, []);

  const navigateTo = (route: string) => {
    if (route === '/preferences/notifications') {
      setNotificationPopupVisible(true);
    } else if (route === '/preferences/language') {
      setLanguagePopupVisible(true);
    } else if (route === '/preferences/appearance') {
      setAppearancePopupVisible(true);
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


      {/* Language Selection Popup */}
      <BottomPopup
        visible={languagePopupVisible}
        onClose={() => setLanguagePopupVisible(false)}
        title="Language"
      >
        <View style={styles.languageContainer}>
          <ThemedText style={styles.languageDescription}>
            Select your preferred language. The app will use this language throughout the interface.
          </ThemedText>

          <View style={styles.optionsContainer}>
            {/* English Option */}
            <TouchableOpacity
              style={styles.languageOption}
              onPress={() => setSelectedLanguage('en')}
            >
              <View style={styles.optionLeft}>
                <Text style={styles.flagText}>🇺🇸</Text>
                <View style={styles.languageInfo}>
                  <ThemedText type="defaultSemiBold">English</ThemedText>
                  <ThemedText style={styles.languageCode}>EN</ThemedText>
                </View>
              </View>

              {selectedLanguage === 'en' ? (
                <Ionicons name="checkmark-circle" size={24} color="#0A58A5" />
              ) : (
                <View style={styles.unselectedCircle} />
              )}
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* French Option */}
            <TouchableOpacity
              style={styles.languageOption}
              onPress={() => setSelectedLanguage('fr')}
            >
              <View style={styles.optionLeft}>
                <Text style={styles.flagText}>🇫🇷</Text>
                <View style={styles.languageInfo}>
                  <ThemedText type="defaultSemiBold">Français</ThemedText>
                  <ThemedText style={styles.languageCode}>FR</ThemedText>
                </View>
              </View>

              {selectedLanguage === 'fr' ? (
                <Ionicons name="checkmark-circle" size={24} color="#0A58A5" />
              ) : (
                <View style={styles.unselectedCircle} />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={async () => {
              try {
                await AsyncStorage.setItem('userLanguage', selectedLanguage);
                // Here you would trigger language change in your app
                setLanguagePopupVisible(false);
              } catch (error) {
                console.error('Failed to save language preference:', error);
              }
            }}
          >
            <ThemedText style={styles.saveButtonText}>Save</ThemedText>
          </TouchableOpacity>
        </View>
      </BottomPopup>

      {/* Appearance Selection Popup */}
      <BottomPopup
        visible={appearancePopupVisible}
        onClose={() => setAppearancePopupVisible(false)}
        title="Appearance"
      >
        <View style={styles.appearanceContainer}>
          <ThemedText style={styles.appearanceDescription}>
            Choose how LaZone looks on your device.
          </ThemedText>

          <View style={styles.optionsContainer}>
            {/* System Default Option */}
            <TouchableOpacity
              style={styles.appearanceOption}
              onPress={() => setSelectedAppearance('system')}
            >
              <View style={styles.optionLeft}>
                <View style={styles.themeIconContainer}>
                  <Ionicons name="phone-portrait-outline" size={24} color={theme.text} />
                </View>
                <View>
                  <ThemedText type="defaultSemiBold">System Default</ThemedText>
                  <ThemedText style={styles.appearanceDescription}>
                    Match your device settings
                  </ThemedText>
                </View>
              </View>

              {selectedAppearance === 'system' ? (
                <Ionicons name="checkmark-circle" size={24} color="#0A58A5" />
              ) : (
                <View style={styles.unselectedCircle} />
              )}
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Light Mode Option */}
            <TouchableOpacity
              style={styles.appearanceOption}
              onPress={() => setSelectedAppearance('light')}
            >
              <View style={styles.optionLeft}>
                <View style={[styles.themeIconContainer, styles.lightIconContainer]}>
                  <Ionicons name="sunny" size={24} color="#e1a100" />
                </View>
                <View>
                  <ThemedText type="defaultSemiBold">Light</ThemedText>
                  <ThemedText style={styles.appearanceDescription}>
                    Light background with dark text
                  </ThemedText>
                </View>
              </View>

              {selectedAppearance === 'light' ? (
                <Ionicons name="checkmark-circle" size={24} color="#0A58A5" />
              ) : (
                <View style={styles.unselectedCircle} />
              )}
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Dark Mode Option */}
            <TouchableOpacity
              style={styles.appearanceOption}
              onPress={() => setSelectedAppearance('dark')}
            >
              <View style={styles.optionLeft}>
                <View style={[styles.themeIconContainer, styles.darkIconContainer]}>
                  <Ionicons name="moon" size={22} color="#FFFFFF" />
                </View>
                <View>
                  <ThemedText type="defaultSemiBold">Dark</ThemedText>
                  <ThemedText style={styles.appearanceDescription}>
                    Dark background with light text
                  </ThemedText>
                </View>
              </View>

              {selectedAppearance === 'dark' ? (
                <Ionicons name="checkmark-circle" size={24} color="#0A58A5" />
              ) : (
                <View style={styles.unselectedCircle} />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={async () => {
              try {
                await AsyncStorage.setItem('userAppearance', selectedAppearance);
                // Apply the changes here before dismissing the popup
                setAppearancePopupVisible(false);
              } catch (error) {
                console.error('Failed to save appearance preference:', error);
              }
            }}
          >
            <ThemedText style={styles.saveButtonText}>Save</ThemedText>
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
    // Notification styles
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
    // Language selection styles
    languageContainer: {
      padding: 10,
      marginBottom: 30,
    },
    languageDescription: {
      fontSize: 14,
      opacity: 0.7,
      marginBottom: 20,
      paddingHorizontal: 10,
    },
    optionsContainer: {
      backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#ffffff',
      borderRadius: 12,
      marginBottom: 10,
    },
    languageOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 20,
    },
    optionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    flagText: {
      fontSize: 24,
      marginRight: 16,
    },
    languageInfo: {
      flexDirection: 'column',
    },
    languageCode: {
      fontSize: 12,
      opacity: 0.6,
      marginTop: 2,
    },
    unselectedCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colorScheme === 'dark' ? '#444' : '#d9d9d9',
    },
    // Appearance styles
    appearanceContainer: {
      padding: 10,
      marginBottom: 30,
    },
    appearanceDescription: {
      fontSize: 14,
      opacity: 0.7,
      marginBottom: 20,
      paddingHorizontal: 10,
    },
    appearanceOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 20,
    },
    themeIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colorScheme === 'dark' ? '#333' : '#e0e0e0',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    lightIconContainer: {
      backgroundColor: '#F8F8F8',
      borderWidth: 1,
      borderColor: '#E0E0E0',
    },
    darkIconContainer: {
      backgroundColor: '#1A1A1A',
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