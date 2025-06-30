import { useEffect } from 'react';
import { StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Stack, useRouter, useNavigation } from 'expo-router';
import { Appearance } from 'react-native';
import { Colors } from '@/constants/Colors';
import { MenuSection } from '@/components/ui/MenuSection';
import { MenuItem } from '@/types/user';

export default function PreferencesScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);

  useEffect(() => {
    navigation.setOptions({ title: 'Preferences' });
  }, []);

  const navigateTo = (route: string) => {
    router.push(route);
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
    </SafeAreaView>
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
  });
}