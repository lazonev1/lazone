import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, View, Text } from 'react-native';
import { Stack, useRouter, useNavigation } from 'expo-router';
import { Appearance } from 'react-native';
import { Colors } from '@/constants/Colors';
import { MenuSection } from '@/components/ui/MenuSection';
import { MenuItem } from '@/types/user';
import { BottomPopup } from '@/components/account/BottomPopup';
import { ThemedText } from '@/components/ThemedText';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Contains the Languages and Appearance preference settings.
// Both are inside a BottomPopup and become visible on click.

export default function PreferencesScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);

  // Language setting state
  const [languagePopupVisible, setLanguagePopupVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'fr'>('en');
  // Appearance state variables
  const [appearancePopupVisible, setAppearancePopupVisible] = useState(false);
  const [selectedAppearance, setSelectedAppearance] = useState<'light' | 'dark' | 'system'>('system');

  useEffect(() => {
    navigation.setOptions({ title: 'Preferences' });

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
    if (route === '/preferences/language') {
      setLanguagePopupVisible(true);
    } else if (route === '/preferences/appearance') {
      setAppearancePopupVisible(true);
    } else {
      router.push(route as any);
    }
  };

  const preferenceItems: MenuItem[] = [
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
      <ScrollView>
        <MenuSection
          items={preferenceItems}
          onPress={navigateTo}
          styles={styles}
        />
      </ScrollView>

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

function createStyles(theme: any, colorScheme: 'dark' | 'light' | null | undefined) {
  return StyleSheet.create({
    container: {
      flex: 1,
      // backgroundColor: theme.background, This is setting the background to dark grey. Not pure dark.
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
    // Language selection styles
    languageContainer: {
      padding: 10,
      marginBottom: 30,
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

